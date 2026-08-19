import type { CategoryBudgetOverride } from "@/lib/category-budget";
import { getCategoryHex } from "@/lib/category-colors";
import { eduCostForAge } from "./education-costs";
import type { ScenarioConfig } from "./types";

type IncomeEntry = ScenarioConfig["income"]["husband"];
type Kid = ScenarioConfig["family"]["kids"][number];

// piggybank.special_entries(Transactionsの特別支出トグル・旧Simulationと共有の
// 実データ)の1件。「特別支出」「特別収入」タブは、シナリオ専用の別データを
// 持たずこの実データと連動する。
export interface SpecialEntryInput {
  month: string; // "YYYY-MM"
  kind: "income" | "expense";
  amount: number;
  currency: "JPY" | "VND";
}

function specialEntryYen(e: SpecialEntryInput, vndPerJpy: number): number {
  return e.currency === "JPY" ? e.amount : vndPerJpy > 0 ? e.amount / vndPerJpy : 0;
}

// 産休・育休(基本): 出生年(age===0)は対象親の収入を65%として計算する(法定の
// 産休67%・育休67〜80%/50%の細かい再現はせず、ざっくり中間の65%で近似)。
// 延長育休: 年数を指定すると、対象期間の翌年からその年数ぶん(age 1〜
// leaveExtensionYears)、対象親の収入を0%として計算する。
// 複数の子どもで重なる場合は、優先度が高い方(基本65% > 延長0%)を採用する。
function leaveMultiplierForYear(parentKey: "husband" | "wife", kids: Kid[], year: number): number {
  let best: number | null = null;
  for (const kid of kids) {
    if (kid.leaveParent !== parentKey) continue;
    const age = year - kid.birthYear;
    let candidate: number | null = null;
    if (age === 0) candidate = 65;
    else if (age >= 1 && age <= kid.leaveExtensionYears) candidate = 0;
    if (candidate !== null) best = best === null ? candidate : Math.max(best, candidate);
  }
  return (best ?? 100) / 100;
}

function netAnnualForYear(
  entry: IncomeEntry,
  year: number,
  yearsFromStart: number,
  parentKey: "husband" | "wife",
  kids: Kid[],
): number {
  const monthlyNet = entry.netMonthlyYen * Math.pow(1 + entry.raisePercent / 100, yearsFromStart);
  const bonusTotalYen = entry.netBonuses.reduce((s, b) => s + b.amountYen, 0);
  const bonusNet = bonusTotalYen * Math.pow(1 + entry.raisePercent / 100, yearsFromStart);
  const multiplier = leaveMultiplierForYear(parentKey, kids, year);
  return monthlyNet * 12 * multiplier + bonusNet;
}

// 月次表示専用: その月の手取り(月給ぶん+その月が対象のボーナス)。ボーナスは
// 年換算で均等按分せず、指定した月にそのまま計上する(要望: 「ボーナスを6月・
// 12月だけに設定したのに月次テーブルに反映されていない」への対応)。
function netMonthYen(
  entry: IncomeEntry,
  year: number,
  month: number,
  yearsFromStart: number,
  parentKey: "husband" | "wife",
  kids: Kid[],
): number {
  const raiseFactor = Math.pow(1 + entry.raisePercent / 100, yearsFromStart);
  const monthlyNet = entry.netMonthlyYen * raiseFactor * leaveMultiplierForYear(parentKey, kids, year);
  const bonusThisMonth = entry.netBonuses.filter((b) => b.month === month).reduce((s, b) => s + b.amountYen, 0) * raiseFactor;
  return monthlyNet + bonusThisMonth;
}

export const SIMULATION_YEARS_AHEAD = 15;

export interface CategoryForScenario {
  id: string;
  name: string;
  budget: number; // VND, monthly
  is_fixed: boolean;
  renewal_cycle_years: number | null;
  renewal_fee_months: number | null;
}

export interface ScenarioCategoryValue {
  id: string;
  name: string;
  valueYen: number;
  color: string;
}

export interface ScenarioYearRow {
  year: number;
  husbandYen: number;
  wifeYen: number;
  sideYen: number;
  allowanceYen: number;
  investProfitYen: number;
  specialIncomeYen: number;
  incomeTotalYen: number;
  fixedByCategory: ScenarioCategoryValue[];
  fixedTotalYen: number;
  variableByCategory: ScenarioCategoryValue[];
  variableTotalYen: number;
  // 今年ぶんの月次表示専用。カテゴリid -> 12ヶ月ぶんの円配列(経過月は実績、
  // 未経過月は予算ベース)。今年以外の年、および同棲前の簡易項目には無い
  // (undefinedならexpandMonthly側で従来通り年額を均等按分する)。
  fixedByCategoryMonthly?: Record<string, number[]>;
  variableByCategoryMonthly?: Record<string, number[]>;
  educationTotalYen: number;
  eventsTotalYen: number;
  specialExpenseYen: number;
  expenseTotalYen: number;
  netFlowYen: number;
  cashCumYen: number;
  investBalYen: number;
  // この年の1月時点(=前年末)の運用残高。月次表示で、年内の投資残高の増え方を
  // 均等按分ではなく期首→期末の線形補間にするために使う(年次の行にのみ持たせる)。
  investBalStartYen?: number;
  profitCumYen: number;
  savingsCumTotalYen: number;
}

export interface ScenarioRow extends Omit<ScenarioYearRow, "year"> {
  yearLabel: string; // "2026" for yearly rows, "2026/01" for monthly rows
}

// 「持続的(effective-dated)」オーバーライドだけを対象年へのスケジュールとして
// 使う。期間限定オーバーライドは近い将来の一時的な実額調整であって長期計画の
// 前提ではないため、15年先までの投影には使わない。
function projectCategoryMonthlyYen(
  category: { id: string; budget: number },
  overridesForCategory: CategoryBudgetOverride[],
  year: number,
  inflationRatePercent: number,
  vndPerJpy: number,
  nowYear: number,
): number {
  const persistent = overridesForCategory
    .filter((o) => o.end_month === null)
    .slice()
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));

  let baseVnd = category.budget;
  let baseYear = nowYear;
  for (const o of persistent) {
    const oYear = parseInt(o.month.slice(0, 4), 10);
    if (oYear <= year) {
      baseVnd = o.budget;
      baseYear = oYear;
    }
  }
  const yearsBeyond = Math.max(0, year - baseYear);
  const inflated = baseVnd * Math.pow(1 + inflationRatePercent / 100, yearsBeyond);
  return inflated / vndPerJpy;
}

function renewalFeeYenForYear(
  category: CategoryForScenario,
  overridesForCategory: CategoryBudgetOverride[],
  year: number,
  inflationRatePercent: number,
  vndPerJpy: number,
  nowYear: number,
): number {
  if (!category.renewal_cycle_years || !category.renewal_fee_months) return 0;
  const persistent = overridesForCategory.filter((o) => o.end_month === null);
  const anchorYear =
    persistent.length > 0
      ? Math.min(...persistent.map((o) => parseInt(o.month.slice(0, 4), 10)))
      : nowYear;
  if (year <= anchorYear) return 0;
  if ((year - anchorYear) % category.renewal_cycle_years !== 0) return 0;
  const monthlyYen = projectCategoryMonthlyYen(
    category,
    overridesForCategory,
    year,
    inflationRatePercent,
    vndPerJpy,
    nowYear,
  );
  return monthlyYen * category.renewal_fee_months;
}

// 同棲前のカテゴリごとの月額。実カテゴリ(projectCategoryMonthlyYen)と同じ考え方:
// 持続的オーバーライド(endMonth===null)があればそれを起点にし、それより先の
// 年数ぶんだけインフレ率を複利適用する。
function preLifeMonthlyYen(
  item: { monthlyYen: number; overrides: { month: string; endMonth: string | null; amountYen: number }[] },
  year: number,
  inflationRatePercent: number,
  nowYear: number,
): number {
  const persistent = item.overrides
    .filter((o) => o.endMonth === null)
    .slice()
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));

  let base = item.monthlyYen;
  let baseYear = nowYear;
  for (const o of persistent) {
    const oYear = parseInt(o.month.slice(0, 4), 10);
    if (oYear <= year) {
      base = o.amountYen;
      baseYear = oYear;
    }
  }
  const yearsBeyond = Math.max(0, year - baseYear);
  return base * Math.pow(1 + inflationRatePercent / 100, yearsBeyond);
}

// 同棲前・同棲後を通じて同じカテゴリ(id)を使う。同棲前だけの月額
// (preAmountByCategory)が設定されていればそれを、無ければ同棲後の実額を
// そのまま同棲前の値としても使う(「同棲前後で同じ内容」がデフォルト)。
function preCategoryMonthlyYen(
  category: { id: string; budget: number },
  preAmountByCategory: Record<string, { monthlyYen: number; overrides: { month: string; endMonth: string | null; amountYen: number }[] }>,
  overridesForCategory: CategoryBudgetOverride[],
  year: number,
  inflationRatePercent: number,
  vndPerJpy: number,
  nowYear: number,
): number {
  const preAmt = preAmountByCategory[category.id];
  if (!preAmt) {
    return projectCategoryMonthlyYen(category, overridesForCategory, year, inflationRatePercent, vndPerJpy, nowYear);
  }
  return preLifeMonthlyYen(preAmt, year, inflationRatePercent, nowYear);
}

// 今年の月次表示専用: 経過済みの月(今月を含む)はその月の実績、未経過の月は
// 予算ベース(同棲前後どちらのフェーズかに応じた月額)の月額をそのまま使う
// 12ヶ月ぶんの配列を返す(要望: 「今年の月次表示で過去月にも実績ではなく
// 年換算の平均値が出ていた」への対応)。
function categoryMonthlyActualOrBudgetYen(
  category: { id: string; budget: number },
  overridesForCategory: CategoryBudgetOverride[],
  preAmountByCategory: Record<string, { monthlyYen: number; overrides: { month: string; endMonth: string | null; amountYen: number }[] }>,
  cohabiting: boolean,
  monthlyActualVnd: Record<string, number> | undefined,
  currentMonth: number,
  inflationRatePercent: number,
  vndPerJpy: number,
  nowYear: number,
): number[] {
  const budgetMonthlyYen = cohabiting
    ? projectCategoryMonthlyYen(category, overridesForCategory, nowYear, inflationRatePercent, vndPerJpy, nowYear)
    : preCategoryMonthlyYen(category, preAmountByCategory, overridesForCategory, nowYear, inflationRatePercent, vndPerJpy, nowYear);
  return Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    if (m <= currentMonth) {
      // 経過月は必ず実績を使う(その月の取引が1件も無いカテゴリはキー自体が
      // 存在しないため undefined になるが、それは「実績0円」であって「不明だから
      // 予算で埋める」ではない。ここをbudgetMonthlyYenにfallbackしていたのが、
      // 年次合計(annualCategoryYen: 実績の総額を使う)と月次内訳の合計が
      // 食い違う=貯蓄サマリーカードとテーブルの数字が食い違うバグの原因だった)。
      const key = `${nowYear}-${String(m).padStart(2, "0")}`;
      const actualVnd = monthlyActualVnd?.[key] ?? 0;
      return actualVnd / vndPerJpy;
    }
    return budgetMonthlyYen;
  });
}

// 今年ぶんは、予算projectionだけでなく「経過月までの実績」も併せて使う。
// 以前はここだけ「年初来実績を経過日数で年換算(トレンド外挿)」していたが、
// 月次内訳(categoryMonthlyActualOrBudgetYen: 経過月=実績そのもの、未経過月=
// 予算)とは別の計算式だったため、月次テーブルを12ヶ月ぶん合計した値と
// この年次の値がズレる(=貯蓄サマリーカードとテーブルの数字が食い違う)
// バグになっていた。月次内訳の合計と必ず一致するよう、
// 「経過月ぶんの実績 + 残り月数×月額予算」という同じ式に統一する。
// 実績が無いカテゴリ(まだ一度も使っていない等)は従来通り予算ベース。
function annualCategoryYen(
  category: { name: string },
  monthlyYen: number,
  year: number,
  nowYear: number,
  nowMonth: number,
  vndPerJpy: number,
  actualByCategoryVnd: Record<string, number>,
): number {
  if (year !== nowYear) return monthlyYen * 12;
  const actualVnd = actualByCategoryVnd[category.name];
  if (!actualVnd || actualVnd <= 0) return monthlyYen * 12;
  const actualYtdYen = actualVnd / vndPerJpy;
  const remainingMonths = 12 - nowMonth;
  return actualYtdYen + monthlyYen * remainingMonths;
}

// 児童手当: 0〜2歳 1.5万円/月、3歳〜高校生(18歳)まで 1万円/月。要件5-2。
function childAllowanceYenForYear(birthYear: number, year: number): number {
  const age = year - birthYear;
  if (age < 0) return 0;
  if (age <= 2) return 180_000;
  if (age <= 18) return 120_000;
  return 0;
}

export function computeScenarioYears(
  config: ScenarioConfig,
  categories: CategoryForScenario[],
  overrides: CategoryBudgetOverride[],
  vndPerJpy: number,
  startYear: number = new Date().getFullYear(),
  // 今年ぶんのカテゴリ別実績(VND、カテゴリ名キー)。今年は予算projectionだけでなく
  // 「今日までの実績を年換算した見込み」も併せて使う(要望: 既にある今年の実績が
  // Simulationに反映されていない、への対応)。
  actualByCategoryVnd: Record<string, number> = {},
  // 今年ぶんのカテゴリ別・月別実績(VND、カテゴリ名→"YYYY-MM"→VND)。今年の月次
  // 表示で、経過済みの月は実績そのものを、未経過の月は予算ベースを使うために使う
  // (要望: 月次表示で過去月にも年換算の平均値しか出ていなかった、への対応)。
  actualByCategoryMonthVnd: Record<string, Record<string, number>> = {},
  // piggybank.special_entries(特別支出・特別収入の実データ)。
  specialEntries: SpecialEntryInput[] = [],
): ScenarioYearRow[] {
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;
  const years = Array.from({ length: SIMULATION_YEARS_AHEAD + 1 }, (_, i) => startYear + i);

  const overridesByCategory = new Map<string, CategoryBudgetOverride[]>();
  for (const o of overrides) {
    const arr = overridesByCategory.get(o.category_id);
    if (arr) arr.push(o);
    else overridesByCategory.set(o.category_id, [o]);
  }

  const fixedCats = categories.filter((c) => c.is_fixed);
  const variableCats = categories.filter((c) => !c.is_fixed);

  // シナリオ開始年の1月時点の現金・投資残高を初期値として積み上げる。
  let cashCum = config.savings.initialCashYen;
  let investBal = config.savings.initialInvestYen;
  let investPrincipalCum = config.savings.initialInvestYen;

  return years.map((year, i) => {
    // 同棲開始年から: 配偶者の収入・カテゴリの実額(同棲後の値)が反映される。
    // それより前: 配偶者収入は0、カテゴリは同棲前専用の値(無ければ同棲後と同じ)。
    const cohabiting = year >= config.cohabitation.startYear;
    const moveInBonusYen = year === config.cohabitation.startYear ? config.cohabitation.moveInBonusYen : 0;

    // 入力は手取り(月+ボーナス)。額面年収は設定モーダル側でview-only表示用に
    // 逆算するだけで、ここでの収支計算には使わない。産休・育休期間があれば、
    // その月ぶんの月収だけ incomePercent% に減らす。
    const husbandYen = netAnnualForYear(config.income.husband, year, i, "husband", config.family.kids);
    const wifeYen = config.family.spouse && cohabiting ? netAnnualForYear(config.income.wife, year, i, "wife", config.family.kids) : 0;
    const sideActiveThisYear =
      (config.income.side.startYear === null || year >= config.income.side.startYear) &&
      (config.income.side.endYear === null || year <= config.income.side.endYear);
    const sideYen = sideActiveThisYear ? config.income.side.amountYen * 12 : 0;
    const allowanceYen = config.family.kids.reduce(
      (sum, kid) => sum + childAllowanceYenForYear(kid.birthYear, year),
      0,
    );
    // 投資益は前年末時点の運用残高に対して定率(returnRatePercent)で計算し、
    // 総収入の内訳として計上する(以前は総貯蓄側にだけ黙って積み上がり、
    // 「収入-支出」と貯蓄の増分が一致しないという指摘があったため)。
    // 今年の新規積立分(investDelta)自体には今年ぶんの運用益を付けない
    // (積立配分が投資益にも依存する循環を避けるための簡略化)。
    const investProfitYen = investBal * (config.savings.returnRatePercent / 100);
    const specialIncomeYen = specialEntries
      .filter((e) => e.kind === "income" && e.month.startsWith(`${year}-`))
      .reduce((s, e) => s + specialEntryYen(e, vndPerJpy), 0);
    const incomeTotalYen = husbandYen + wifeYen + sideYen + allowanceYen + moveInBonusYen + investProfitYen + specialIncomeYen;

    // 固定費・変動費は、同棲前後どちらの年でも同じカテゴリ(piggybank.categories)を
    // 使う。月額の出どころだけ、同棲後は実カテゴリの予算、同棲前は
    // preAmountByCategory(無ければ同棲後の実額をそのまま流用)で分岐する
    // (要望: 「同棲前・同棲後いずれにしても共通のカテゴリを利用」への対応。
    // 以前はidが同棲前後で食い違い、テーブルのカテゴリ内訳行が同棲後の年で
    // ¥0になるバグの原因になっていた)。
    const fixedByCategory: ScenarioCategoryValue[] = fixedCats.map((c) => {
      const overridesForCat = overridesByCategory.get(c.id) ?? [];
      const monthlyYen = cohabiting
        ? projectCategoryMonthlyYen(c, overridesForCat, year, config.inflationRatePercent, vndPerJpy, nowYear)
        : preCategoryMonthlyYen(
            c,
            config.cohabitation.preAmountByCategory,
            overridesForCat,
            year,
            config.inflationRatePercent,
            vndPerJpy,
            nowYear,
          );
      const renewalYen = renewalFeeYenForYear(c, overridesForCat, year, config.inflationRatePercent, vndPerJpy, nowYear);
      const valueYen = annualCategoryYen(c, monthlyYen, year, nowYear, nowMonth, vndPerJpy, actualByCategoryVnd) + renewalYen;
      return { id: c.id, name: c.name, valueYen, color: getCategoryHex(c.name) };
    });
    const fixedTotalYen = fixedByCategory.reduce((s, c) => s + c.valueYen, 0);

    // 今年の月次表示専用の内訳(経過月=実績、未経過月=予算)。他の年では作らない
    // (expandMonthly側で従来通り年額を均等按分にfallbackする)。
    const fixedByCategoryMonthly: Record<string, number[]> | undefined =
      year === nowYear
        ? Object.fromEntries(
            fixedCats.map((c) => [
              c.id,
              categoryMonthlyActualOrBudgetYen(
                c,
                overridesByCategory.get(c.id) ?? [],
                config.cohabitation.preAmountByCategory,
                cohabiting,
                actualByCategoryMonthVnd[c.name],
                nowMonth,
                config.inflationRatePercent,
                vndPerJpy,
                nowYear,
              ),
            ]),
          )
        : undefined;

    const variableByCategory: ScenarioCategoryValue[] = variableCats.map((c) => {
      const overridesForCat = overridesByCategory.get(c.id) ?? [];
      const monthlyYen = cohabiting
        ? projectCategoryMonthlyYen(c, overridesForCat, year, config.inflationRatePercent, vndPerJpy, nowYear)
        : preCategoryMonthlyYen(
            c,
            config.cohabitation.preAmountByCategory,
            overridesForCat,
            year,
            config.inflationRatePercent,
            vndPerJpy,
            nowYear,
          );
      const valueYen = annualCategoryYen(c, monthlyYen, year, nowYear, nowMonth, vndPerJpy, actualByCategoryVnd);
      return { id: c.id, name: c.name, valueYen, color: getCategoryHex(c.name) };
    });
    const variableTotalYen = variableByCategory.reduce((s, c) => s + c.valueYen, 0);

    const variableByCategoryMonthly: Record<string, number[]> | undefined =
      year === nowYear
        ? Object.fromEntries(
            variableCats.map((c) => [
              c.id,
              categoryMonthlyActualOrBudgetYen(
                c,
                overridesByCategory.get(c.id) ?? [],
                config.cohabitation.preAmountByCategory,
                cohabiting,
                actualByCategoryMonthVnd[c.name],
                nowMonth,
                config.inflationRatePercent,
                vndPerJpy,
                nowYear,
              ),
            ]),
          )
        : undefined;

    const educationTotalYen = config.family.kids.reduce((sum, kid, kidIdx) => {
      const age = year - kid.birthYear;
      if (age < 0) return sum;
      return sum + eduCostForAge(age, config.education[String(kidIdx)]);
    }, 0);

    // 結婚式(単発)・旅行(毎年繰り返す、暮らしと同じインフレ率で複利)は常設フォーム
    // のイベントとして、汎用のevents配列とは別に計算する。UIにON/OFFチェックボックスは
    // 置かない(1ステップ余分になるため)ので、金額0円=未計上として扱う。
    const weddingYen = config.wedding.amountYen > 0 && config.wedding.year === year ? config.wedding.amountYen : 0;
    const travelYen =
      config.travel.amountYen > 0 && year >= config.travel.startYear
        ? config.travel.amountYen * Math.pow(1 + config.inflationRatePercent / 100, year - config.travel.startYear)
        : 0;
    // 特別支出はspecial_entries(実データ)と連動する。
    const specialExpenseYen = specialEntries
      .filter((e) => e.kind === "expense" && e.month.startsWith(`${year}-`))
      .reduce((s, e) => s + specialEntryYen(e, vndPerJpy), 0);
    const eventsTotalYen = weddingYen + travelYen + specialExpenseYen;

    const expenseTotalYen = fixedTotalYen + variableTotalYen + educationTotalYen + eventsTotalYen;
    // netFlowYen(表示用)は投資益を含む総収入から計算する。ただし積立配分
    // (investRatioPercent)は「稼いだ」ぶんの黒字(投資益を除く)にのみ適用し、
    // 投資益そのものは全額そのまま運用残高に再投資する(積立配分が投資益にも
    // 依存する循環を避けつつ、収入-支出=貯蓄の増分が一致するようにするため)。
    const netFlowYen = incomeTotalYen - expenseTotalYen;
    const earnedNetFlowYen = netFlowYen - investProfitYen;

    // 現金の安全ライン: 投資に回した結果、手元の現金が¥100,000を下回るなら
    // 投資はせず全額現金に残す(現金がマイナス/心もとない状態で積立を続ける
    // のは不自然なため)。¥100,000以上残る見込みのときだけ、通常どおり
    // investRatioPercentぶんを投資に回す。
    const MIN_CASH_TO_INVEST_YEN = 100_000;
    const cashIfNoInvestYen = cashCum + earnedNetFlowYen;
    let investDelta = 0;
    let cashDelta = 0;
    if (earnedNetFlowYen >= 0 && cashIfNoInvestYen >= MIN_CASH_TO_INVEST_YEN) {
      investDelta = (earnedNetFlowYen * config.savings.investRatioPercent) / 100;
      cashDelta = earnedNetFlowYen - investDelta;
    } else {
      cashDelta = earnedNetFlowYen;
    }
    const investBalStartYen = investBal;
    investBal = investBal + investDelta + investProfitYen;
    investPrincipalCum += investDelta;
    cashCum += cashDelta;
    const profitCumYen = investBal - investPrincipalCum;
    const savingsCumTotalYen = cashCum + investBal;

    return {
      year,
      husbandYen,
      wifeYen,
      sideYen,
      allowanceYen,
      investProfitYen,
      specialIncomeYen,
      incomeTotalYen,
      fixedByCategory,
      fixedTotalYen,
      fixedByCategoryMonthly,
      variableByCategory,
      variableTotalYen,
      variableByCategoryMonthly,
      educationTotalYen,
      eventsTotalYen,
      specialExpenseYen,
      expenseTotalYen,
      netFlowYen,
      cashCumYen: cashCum,
      investBalYen: investBal,
      investBalStartYen,
      profitCumYen,
      savingsCumTotalYen,
    };
  });
}

// ダッシュボードの「投資を記録」で登録した、実際の投資記録の1件。
export interface InvestmentEntryInput {
  amountVnd: number;
  investedOn: string; // "YYYY-MM-DD"
}

// 年次の1行を、指定年の12ヶ月ぶんに単純按分して展開する。イベントだけは
// 実際の月(event.month)にそのまま計上する(design原案は6月固定だったが、
// イベントは月を持っているのでそちらを使う方が正確)。
export function expandMonthly(
  yearRows: ScenarioYearRow[],
  config: ScenarioConfig,
  focusYear: number,
  vndPerJpy: number = 1,
  // 今年ぶんの月次表示専用: 経過済みの月は、想定利率でのprojectionではなく
  // 実際に記録した投資額(累計)をそのまま「投資」に使う(未記録ならまだ¥0の
  // まま)。差額は「現金」側で吸収する(現金→投資へお金が動く、という
  // 実際のお金の動きに合わせるため)。
  investmentEntries: InvestmentEntryInput[] = [],
  // 特別支出・特別収入(special_entries)。年次と違い、月次表示ではその月
  // (YYYY-MM)に一致するものだけをそのまま計上する(年内の均等按分はしない)。
  specialEntries: SpecialEntryInput[] = [],
): ScenarioRow[] {
  const row = yearRows.find((y) => y.year === focusYear) ?? yearRows[0];
  if (!row) return [];
  const divide = (v: number) => v / 12;
  const nowYearForInvest = new Date().getFullYear();
  const nowMonthForInvest = new Date().getMonth() + 1;
  const isCurrentYearView = focusYear === nowYearForInvest;
  // 「今」時点(今月末まで)の実際の投資額累計。今年の未経過月を、ここから年末の
  // projectionまで線形に増やしていくための起点にする。
  const realInvestAtNowYen = isCurrentYearView
    ? (() => {
        const cutoff = `${nowYearForInvest}-${String(nowMonthForInvest).padStart(2, "0")}-31`;
        const totalVnd = investmentEntries.filter((e) => e.investedOn <= cutoff).reduce((s, e) => s + e.amountVnd, 0);
        return vndPerJpy > 0 ? totalVnd / vndPerJpy : 0;
      })()
    : 0;
  // netAnnualForYear/computeScenarioYearsと同じ前提(シナリオは常に「今年」を
  // startYearとして計算している)で、その年の昇給・産休育休の複利年数を求める。
  const yearsFromStart = focusYear - new Date().getFullYear();
  const cohabitingThisYear = focusYear >= config.cohabitation.startYear;
  // 収入合計のうち、本人/配偶者/副業/子育て支援/投資益/特別収入の按分では
  // 説明が付かない残り(同棲時の一時収入等)は、従来通り年額を均等按分して
  // 埋め合わせる。
  const otherIncomeAnnualYen =
    row.incomeTotalYen -
    row.husbandYen -
    row.wifeYen -
    row.sideYen -
    row.allowanceYen -
    row.investProfitYen -
    row.specialIncomeYen;
  // 貯蓄の累計は「年末の累計から、残り月数ぶんを年間平均netFlowで引く」という
  // 線形補間だったが、ボーナス月やイベント月のように月ごとのnetFlowが大きく
  // 違う場合、隣り合う月の差がその月のdelta表示(実際のnetFlowYen)と一致しない
  // バグになっていた(例: ある月の貯蓄額が前月+その月のdeltaにならない)。
  // 前年末の累計を起点に、各月の実際のnetFlowYenをそのまま積み上げる。
  let cumYen = row.savingsCumTotalYen - row.netFlowYen;
  return Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const husbandYenThisMonth = netMonthYen(config.income.husband, focusYear, m, yearsFromStart, "husband", config.family.kids);
    const wifeYenThisMonth =
      config.family.spouse && cohabitingThisYear
        ? netMonthYen(config.income.wife, focusYear, m, yearsFromStart, "wife", config.family.kids)
        : 0;
    // 結婚式はその月にまとめて計上。旅行は特定の月を持たないので年額を均等按分する。
    const weddingThisMonth =
      config.wedding.amountYen > 0 && config.wedding.year === focusYear && config.wedding.month === m ? config.wedding.amountYen : 0;
    const travelThisYear =
      config.travel.amountYen > 0 && focusYear >= config.travel.startYear
        ? config.travel.amountYen * Math.pow(1 + config.inflationRatePercent / 100, focusYear - config.travel.startYear)
        : 0;
    const monthKey = `${focusYear}-${String(m).padStart(2, "0")}`;
    const specialExpenseThisMonth = specialEntries
      .filter((e) => e.kind === "expense" && e.month === monthKey)
      .reduce((s, e) => s + specialEntryYen(e, vndPerJpy), 0);
    const specialIncomeThisMonth = specialEntries
      .filter((e) => e.kind === "income" && e.month === monthKey)
      .reduce((s, e) => s + specialEntryYen(e, vndPerJpy), 0);
    const eventsThisMonth = weddingThisMonth + divide(travelThisYear) + specialExpenseThisMonth;

    // 今年ぶんは、経過月=実績・未経過月=予算の月次内訳(fixedByCategoryMonthly等)が
    // あればそれを使う。無ければ(他の年、または同棲前フェーズ)従来通り年額を
    // 均等按分する。
    const fixedByCategory = row.fixedByCategory.map((c) => ({
      ...c,
      valueYen: row.fixedByCategoryMonthly?.[c.id]?.[m - 1] ?? divide(c.valueYen),
    }));
    const fixedTotalYen = fixedByCategory.reduce((s, c) => s + c.valueYen, 0);
    const variableByCategory = row.variableByCategory.map((c) => ({
      ...c,
      valueYen: row.variableByCategoryMonthly?.[c.id]?.[m - 1] ?? divide(c.valueYen),
    }));
    const variableTotalYen = variableByCategory.reduce((s, c) => s + c.valueYen, 0);

    const nonEventExpense = fixedTotalYen + variableTotalYen + divide(row.educationTotalYen);
    const expenseTotalYen = nonEventExpense + eventsThisMonth;
    const incomeTotalYen =
      husbandYenThisMonth +
      wifeYenThisMonth +
      divide(row.sideYen) +
      divide(row.allowanceYen) +
      divide(row.investProfitYen) +
      specialIncomeThisMonth +
      divide(otherIncomeAnnualYen);
    const netFlowYen = incomeTotalYen - expenseTotalYen;
    cumYen += netFlowYen;
    const savingsCumTotalYen = cumYen;

    // 投資残高は「均等按分」ではなく、月を追うごとに増えていくように出す。
    // - 今年の経過済み月: その月までの実際の投資額の累計をそのまま使う。
    // - 今年の未経過月: 「今」の実際の投資額から、年末の想定projectionまで
    //   残り月数で線形に増やしていく(急に年末額へ飛ぶのを避ける)。
    // - それ以外の年: その年の期首残高→期末残高を12ヶ月で線形に増やす。
    let investBalYen: number;
    if (isCurrentYearView && m <= nowMonthForInvest) {
      const cutoff = `${focusYear}-${String(m).padStart(2, "0")}-31`;
      const realInvestVnd = investmentEntries
        .filter((e) => e.investedOn <= cutoff)
        .reduce((s, e) => s + e.amountVnd, 0);
      investBalYen = vndPerJpy > 0 ? realInvestVnd / vndPerJpy : 0;
    } else if (isCurrentYearView) {
      const remainingFromNow = 12 - nowMonthForInvest;
      const progress = remainingFromNow > 0 ? (m - nowMonthForInvest) / remainingFromNow : 1;
      investBalYen = realInvestAtNowYen + (row.investBalYen - realInvestAtNowYen) * progress;
    } else {
      const startYen = row.investBalStartYen ?? 0;
      investBalYen = startYen + (row.investBalYen - startYen) * (m / 12);
    }
    const cashCumYen = savingsCumTotalYen - investBalYen;

    return {
      yearLabel: `${focusYear}/${String(m).padStart(2, "0")}`,
      husbandYen: husbandYenThisMonth,
      wifeYen: wifeYenThisMonth,
      sideYen: divide(row.sideYen),
      allowanceYen: divide(row.allowanceYen),
      investProfitYen: divide(row.investProfitYen),
      specialIncomeYen: specialIncomeThisMonth,
      incomeTotalYen,
      fixedByCategory,
      fixedTotalYen,
      variableByCategory,
      variableTotalYen,
      educationTotalYen: divide(row.educationTotalYen),
      eventsTotalYen: eventsThisMonth,
      specialExpenseYen: specialExpenseThisMonth,
      expenseTotalYen,
      netFlowYen,
      cashCumYen,
      investBalYen,
      profitCumYen: row.profitCumYen,
      savingsCumTotalYen,
    };
  });
}

export function toRows(yearRows: ScenarioYearRow[]): ScenarioRow[] {
  return yearRows.map((y) => ({ ...y, yearLabel: String(y.year) }));
}
