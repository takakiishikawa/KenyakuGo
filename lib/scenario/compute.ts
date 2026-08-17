import type { CategoryBudgetOverride } from "@/lib/category-budget";
import { getCategoryHex } from "@/lib/category-colors";
import { eduCostForAge } from "./education-costs";
import type { ScenarioConfig } from "./types";

type IncomeEntry = ScenarioConfig["income"]["husband"];
type Kid = ScenarioConfig["family"]["kids"][number];

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
  const bonusNet = entry.netBonusYen * Math.pow(1 + entry.raisePercent / 100, yearsFromStart);
  const multiplier = leaveMultiplierForYear(parentKey, kids, year);
  return monthlyNet * 12 * multiplier + bonusNet;
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
  incomeTotalYen: number;
  fixedByCategory: ScenarioCategoryValue[];
  fixedTotalYen: number;
  variableByCategory: ScenarioCategoryValue[];
  variableTotalYen: number;
  educationTotalYen: number;
  eventsTotalYen: number;
  expenseTotalYen: number;
  netFlowYen: number;
  cashCumYen: number;
  investBalYen: number;
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

// 同棲前の暮らし項目の、その年の月額。実カテゴリ(projectCategoryMonthlyYen)と
// 同じ考え方: 持続的オーバーライド(endMonth===null)があればそれを起点にし、
// それより先の年数ぶんだけインフレ率を複利適用する。
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

// 今年ぶんは、予算projectionだけでなく「今日までの実績を年換算した見込み」も
// 併せて使う。実績が無いカテゴリ(まだ一度も使っていない等)は従来通り予算ベース。
function annualCategoryYen(
  category: { name: string },
  budgetProjectionAnnualYen: number,
  year: number,
  nowYear: number,
  dayOfYear: number,
  daysInThisYear: number,
  vndPerJpy: number,
  actualByCategoryVnd: Record<string, number>,
): number {
  if (year !== nowYear) return budgetProjectionAnnualYen;
  const actualVnd = actualByCategoryVnd[category.name];
  if (!actualVnd || actualVnd <= 0) return budgetProjectionAnnualYen;
  const annualizedYen = (actualVnd / vndPerJpy) * (daysInThisYear / dayOfYear);
  return annualizedYen;
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
): ScenarioYearRow[] {
  const nowYear = new Date().getFullYear();
  const dayOfYear = Math.ceil((Date.now() - new Date(nowYear, 0, 1).getTime()) / 86_400_000) || 1;
  const daysInThisYear = 365; // うるう年ぶんの誤差(365/366)は無視できる範囲として扱う
  const years = Array.from({ length: SIMULATION_YEARS_AHEAD + 1 }, (_, i) => startYear + i);

  const overridesByCategory = new Map<string, CategoryBudgetOverride[]>();
  for (const o of overrides) {
    const arr = overridesByCategory.get(o.category_id);
    if (arr) arr.push(o);
    else overridesByCategory.set(o.category_id, [o]);
  }

  const fixedCats = categories.filter((c) => c.is_fixed);
  const variableCats = categories.filter((c) => !c.is_fixed);

  let cashCum = 0;
  let investBal = 0;
  let investPrincipalCum = 0;

  return years.map((year, i) => {
    // 同棲開始年から: 配偶者の収入が反映される。
    // それより前: 配偶者収入は0。暮らしについては、同棲前用の項目
    // (preFixed/preVariable)をユーザーが実際に入力している場合だけそちらを使い、
    // 何も入力していなければ(初期状態)共有categoriesの実額をそのまま使う
    // (「同棲開始年を先の年に設定したら今年の暮らしが¥0になった」への対応 —
    // 未入力を「支出0」と解釈するのではなく「まだ同棲後の実額と同じ」とみなす)。
    const cohabiting = year >= config.cohabitation.startYear;
    const useSharedFixed = cohabiting || config.cohabitation.preFixed.length === 0;
    const useSharedVariable = cohabiting || config.cohabitation.preVariable.length === 0;
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
    const incomeTotalYen = husbandYen + wifeYen + sideYen + allowanceYen + moveInBonusYen + investProfitYen;

    const fixedByCategory: ScenarioCategoryValue[] = useSharedFixed
      ? fixedCats.map((c) => {
          const overridesForCat = overridesByCategory.get(c.id) ?? [];
          const monthlyYen = projectCategoryMonthlyYen(
            c,
            overridesForCat,
            year,
            config.inflationRatePercent,
            vndPerJpy,
            nowYear,
          );
          const renewalYen = renewalFeeYenForYear(
            c,
            overridesForCat,
            year,
            config.inflationRatePercent,
            vndPerJpy,
            nowYear,
          );
          const budgetAnnualYen = monthlyYen * 12 + renewalYen;
          const valueYen =
            annualCategoryYen(c, budgetAnnualYen - renewalYen, year, nowYear, dayOfYear, daysInThisYear, vndPerJpy, actualByCategoryVnd) +
            renewalYen;
          return { id: c.id, name: c.name, valueYen, color: getCategoryHex(c.name) };
        })
      : config.cohabitation.preFixed.map((item) => ({
          id: `pre-fixed-${item.id}`,
          name: item.label,
          valueYen: preLifeMonthlyYen(item, year, config.inflationRatePercent, nowYear) * 12,
          color: getCategoryHex(item.label),
        }));
    const fixedTotalYen = fixedByCategory.reduce((s, c) => s + c.valueYen, 0);

    const variableByCategory: ScenarioCategoryValue[] = useSharedVariable
      ? variableCats.map((c) => {
          const overridesForCat = overridesByCategory.get(c.id) ?? [];
          const monthlyYen = projectCategoryMonthlyYen(
            c,
            overridesForCat,
            year,
            config.inflationRatePercent,
            vndPerJpy,
            nowYear,
          );
          const valueYen = annualCategoryYen(c, monthlyYen * 12, year, nowYear, dayOfYear, daysInThisYear, vndPerJpy, actualByCategoryVnd);
          return { id: c.id, name: c.name, valueYen, color: getCategoryHex(c.name) };
        })
      : config.cohabitation.preVariable.map((item) => ({
          id: `pre-variable-${item.id}`,
          name: item.label,
          valueYen: preLifeMonthlyYen(item, year, config.inflationRatePercent, nowYear) * 12,
          color: getCategoryHex(item.label),
        }));
    const variableTotalYen = variableByCategory.reduce((s, c) => s + c.valueYen, 0);

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
    const customEventsYen = config.events.filter((e) => e.year === year).reduce((s, e) => s + e.amountYen, 0);
    const eventsTotalYen = weddingYen + travelYen + customEventsYen;

    const expenseTotalYen = fixedTotalYen + variableTotalYen + educationTotalYen + eventsTotalYen;
    // netFlowYen(表示用)は投資益を含む総収入から計算する。ただし積立配分
    // (investRatioPercent)は「稼いだ」ぶんの黒字(投資益を除く)にのみ適用し、
    // 投資益そのものは全額そのまま運用残高に再投資する(積立配分が投資益にも
    // 依存する循環を避けつつ、収入-支出=貯蓄の増分が一致するようにするため)。
    const netFlowYen = incomeTotalYen - expenseTotalYen;
    const earnedNetFlowYen = netFlowYen - investProfitYen;

    let investDelta = 0;
    let cashDelta = 0;
    if (earnedNetFlowYen >= 0) {
      investDelta = (earnedNetFlowYen * config.savings.investRatioPercent) / 100;
      cashDelta = earnedNetFlowYen - investDelta;
    } else {
      cashDelta = earnedNetFlowYen;
    }
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
      incomeTotalYen,
      fixedByCategory,
      fixedTotalYen,
      variableByCategory,
      variableTotalYen,
      educationTotalYen,
      eventsTotalYen,
      expenseTotalYen,
      netFlowYen,
      cashCumYen: cashCum,
      investBalYen: investBal,
      profitCumYen,
      savingsCumTotalYen,
    };
  });
}

// 年次の1行を、指定年の12ヶ月ぶんに単純按分して展開する。イベントだけは
// 実際の月(event.month)にそのまま計上する(design原案は6月固定だったが、
// イベントは月を持っているのでそちらを使う方が正確)。
export function expandMonthly(
  yearRows: ScenarioYearRow[],
  config: ScenarioConfig,
  focusYear: number,
): ScenarioRow[] {
  const row = yearRows.find((y) => y.year === focusYear) ?? yearRows[0];
  if (!row) return [];
  const divide = (v: number) => v / 12;
  return Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    // 結婚式はその月にまとめて計上。旅行は特定の月を持たないので年額を均等按分する。
    const weddingThisMonth =
      config.wedding.amountYen > 0 && config.wedding.year === focusYear && config.wedding.month === m ? config.wedding.amountYen : 0;
    const travelThisYear =
      config.travel.amountYen > 0 && focusYear >= config.travel.startYear
        ? config.travel.amountYen * Math.pow(1 + config.inflationRatePercent / 100, focusYear - config.travel.startYear)
        : 0;
    const customEventsThisMonth = config.events
      .filter((e) => e.year === focusYear && e.month === m)
      .reduce((s, e) => s + e.amountYen, 0);
    const eventsThisMonth = weddingThisMonth + divide(travelThisYear) + customEventsThisMonth;
    const nonEventExpense =
      divide(row.fixedTotalYen) + divide(row.variableTotalYen) + divide(row.educationTotalYen);
    const expenseTotalYen = nonEventExpense + eventsThisMonth;
    const incomeTotalYen = divide(row.incomeTotalYen);
    const netFlowYen = incomeTotalYen - expenseTotalYen;
    const remainingMonths = 12 - m;
    return {
      yearLabel: `${focusYear}/${String(m).padStart(2, "0")}`,
      husbandYen: divide(row.husbandYen),
      wifeYen: divide(row.wifeYen),
      sideYen: divide(row.sideYen),
      allowanceYen: divide(row.allowanceYen),
      investProfitYen: divide(row.investProfitYen),
      incomeTotalYen,
      fixedByCategory: row.fixedByCategory.map((c) => ({ ...c, valueYen: divide(c.valueYen) })),
      fixedTotalYen: divide(row.fixedTotalYen),
      variableByCategory: row.variableByCategory.map((c) => ({ ...c, valueYen: divide(c.valueYen) })),
      variableTotalYen: divide(row.variableTotalYen),
      educationTotalYen: divide(row.educationTotalYen),
      eventsTotalYen: eventsThisMonth,
      expenseTotalYen,
      netFlowYen,
      cashCumYen: row.cashCumYen - (row.netFlowYen * remainingMonths) / 12,
      investBalYen: row.investBalYen,
      profitCumYen: row.profitCumYen,
      savingsCumTotalYen: row.savingsCumTotalYen - (row.netFlowYen * remainingMonths) / 12,
    };
  });
}

export function toRows(yearRows: ScenarioYearRow[]): ScenarioRow[] {
  return yearRows.map((y) => ({ ...y, yearLabel: String(y.year) }));
}
