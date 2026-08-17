import type { CategoryBudgetOverride } from "@/lib/category-budget";
import { getCategoryHex } from "@/lib/category-colors";
import { eduCostForAge } from "./education-costs";
import type { ScenarioConfig } from "./types";

type IncomeEntry = ScenarioConfig["income"]["husband"];

// 産休・育休期間中は、その月の月収を incomePercent% に減らす(ボーナスは対象外)。
function leaveMultiplier(leavePeriods: IncomeEntry["leavePeriods"], year: number, month: number): number {
  const cur = year * 12 + (month - 1);
  for (const lp of leavePeriods) {
    const start = lp.fromYear * 12 + (lp.fromMonth - 1);
    const end = lp.toYear * 12 + (lp.toMonth - 1);
    if (cur >= start && cur <= end) return lp.incomePercent / 100;
  }
  return 1;
}

function netAnnualForYear(entry: IncomeEntry, year: number, yearsFromStart: number): number {
  const monthlyNet = entry.netMonthlyYen * Math.pow(1 + entry.raisePercent / 100, yearsFromStart);
  const bonusNet = entry.netBonusYen * Math.pow(1 + entry.raisePercent / 100, yearsFromStart);
  let monthsSum = 0;
  for (let m = 1; m <= 12; m++) {
    monthsSum += monthlyNet * leaveMultiplier(entry.leavePeriods, year, m);
  }
  return monthsSum + bonusNet;
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

// 同棲前の暮らし項目(シンプルな月額固定リスト)の、その年の月額。
// 実カテゴリと違って期間別オーバーライドは持たないので、インフレ率だけ
// 「今年」からの経過年数ぶん複利適用する。
function preLifeMonthlyYen(item: { monthlyYen: number }, year: number, inflationRatePercent: number, nowYear: number): number {
  const yearsBeyond = Math.max(0, year - nowYear);
  return item.monthlyYen * Math.pow(1 + inflationRatePercent / 100, yearsBeyond);
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
    // 同棲開始年から: 配偶者の収入・共有カテゴリの暮らしが反映される。
    // それより前: 配偶者収入は0、暮らしはシナリオ側のpreFixed/preVariableを使う。
    const cohabiting = year >= config.cohabitation.startYear;
    const moveInBonusYen = year === config.cohabitation.startYear ? config.cohabitation.moveInBonusYen : 0;

    // 入力は手取り(月+ボーナス)。額面年収は設定モーダル側でview-only表示用に
    // 逆算するだけで、ここでの収支計算には使わない。産休・育休期間があれば、
    // その月ぶんの月収だけ incomePercent% に減らす。
    const husbandYen = netAnnualForYear(config.income.husband, year, i);
    const wifeYen = config.family.spouse && cohabiting ? netAnnualForYear(config.income.wife, year, i) : 0;
    const sideYen = config.income.side.amountYen * 12;
    const allowanceYen = config.family.kids.reduce(
      (sum, kid) => sum + childAllowanceYenForYear(kid.birthYear, year),
      0,
    );
    const incomeTotalYen = husbandYen + wifeYen + sideYen + allowanceYen + moveInBonusYen;

    const fixedByCategory: ScenarioCategoryValue[] = cohabiting
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

    const variableByCategory: ScenarioCategoryValue[] = cohabiting
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

    const eventsTotalYen = config.events
      .filter((e) => e.year === year)
      .reduce((s, e) => s + e.amountYen, 0);

    const expenseTotalYen = fixedTotalYen + variableTotalYen + educationTotalYen + eventsTotalYen;
    const netFlowYen = incomeTotalYen - expenseTotalYen;

    let investDelta = 0;
    let cashDelta = 0;
    if (netFlowYen >= 0) {
      investDelta = (netFlowYen * config.savings.investRatioPercent) / 100;
      cashDelta = netFlowYen - investDelta;
    } else {
      cashDelta = netFlowYen;
    }
    const prevInvestBal = investBal;
    investBal = (prevInvestBal + investDelta) * (1 + config.savings.returnRatePercent / 100);
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
    const eventsThisMonth = config.events
      .filter((e) => e.year === focusYear && e.month === m)
      .reduce((s, e) => s + e.amountYen, 0);
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
