import type { ScenarioRow } from "./compute";
import { catLabel, t, type Lang } from "./dictionary";
import type { SpecialEntry } from "@/lib/simulation";

// 教育・イベントは単独のグラフタブとしては出さない(暮らし・収入・支出ほど
// 見る頻度が高くないため)。中身は支出グラフの内訳系列として引き続き見える。
export type ChartKind = "overview" | "income" | "life" | "expenseTotal" | "savings";

export const CHART_KINDS: ChartKind[] = ["overview", "income", "expenseTotal", "savings", "life"];

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
  // 貯蓄の増減など、プラス/マイナスの符号自体に意味がある系列。tooltipで
  // 「+/-」を付けて、プラスは緑・マイナスは赤で色分けする(総貯蓄行の表示と揃える)。
  signed?: boolean;
  // 特別収入・特別支出のように、その期間の内訳(項目名+金額)をtooltipに
  // 添えたい系列用。ポイントごとの配列(該当項目が無ければundefined)。
  breakdown?: ({ label: string; amount: number }[] | undefined)[];
}

export interface ChartBundle {
  years: string[];
  stacked: boolean;
  series: ChartSeries[];
  // 内訳系列の合計。tooltipの1行目にまとめて出す(収入/支出/貯蓄/暮らし)。
  total?: { label: string; values: number[] };
}

export function chartKindLabel(lang: Lang, kind: ChartKind): string {
  switch (kind) {
    case "overview":
      return t(lang, "overview");
    case "income":
      return t(lang, "incomeBreakdown");
    case "life":
      return t(lang, "lifeBreakdown");
    case "expenseTotal":
      return t(lang, "expenseTotal");
    case "savings":
      return t(lang, "savingsBreakdown");
  }
}

// 年間を通じてずっと¥0の系列は、凡例・グラフ・tooltipに出しても意味が無い
// (例: 副業収入を使っていない、特別支出が今年は無い等)ので取り除く。
function dropAllZero(series: ChartSeries[]): ChartSeries[] {
  return series.filter((s) => s.values.some((v) => v !== 0));
}

function specialEntryYenLocal(e: SpecialEntry, vndPerJpy: number): number {
  return e.currency === "JPY" ? e.amount : vndPerJpy > 0 ? e.amount / vndPerJpy : 0;
}

// 特別収入・特別支出は複数件が1つの金額に集計されているため、tooltipでその
// 内訳(項目名+金額)も見られるようにする。年次表示はその年の全月ぶんを、
// 月次表示はその月(YYYY-MM)に一致するものだけをまとめる。
function specialBreakdownByRow(
  rows: ScenarioRow[],
  kind: "income" | "expense",
  specialEntries: SpecialEntry[],
  vndPerJpy: number,
): ({ label: string; amount: number }[] | undefined)[] {
  return rows.map((r) => {
    const isMonthly = /^\d{4}\/\d{2}$/.test(r.yearLabel);
    const matches = specialEntries.filter((e) => {
      if (e.kind !== kind) return false;
      return isMonthly ? e.month === r.yearLabel.replace("/", "-") : e.month.startsWith(`${r.yearLabel}-`);
    });
    if (matches.length === 0) return undefined;
    return matches.map((e) => ({ label: e.name, amount: specialEntryYenLocal(e, vndPerJpy) }));
  });
}

export function buildChartSeries(
  rows: ScenarioRow[],
  kind: ChartKind,
  lang: Lang,
  specialEntries: SpecialEntry[] = [],
  vndPerJpy: number = 1,
): ChartBundle {
  const years = rows.map((r) => r.yearLabel);
  const first = rows[0];

  switch (kind) {
    case "overview":
      return {
        years,
        stacked: false,
        series: [
          { label: t(lang, "totalIncome"), color: "#16A34A", values: rows.map((r) => r.incomeTotalYen) },
          { label: t(lang, "totalExpense"), color: "#B8621B", values: rows.map((r) => r.expenseTotalYen) },
          { label: t(lang, "totalSavings"), color: "#BE5B85", values: rows.map((r) => r.netFlowYen), signed: true },
        ],
      };
    case "income":
      // 設定モーダルの収入タブと同じ5項目(本人給与/配偶者給与/副業収入/公的支援/
      // 特別収入)。年間を通じて¥0の項目は表示しない。
      return {
        years,
        stacked: true,
        total: { label: t(lang, "totalIncome"), values: rows.map((r) => r.incomeTotalYen) },
        series: dropAllZero([
          { label: t(lang, "husband"), color: "#4C6B8A", values: rows.map((r) => r.husbandYen) },
          { label: t(lang, "wife"), color: "#8B5E83", values: rows.map((r) => r.wifeYen) },
          { label: t(lang, "side"), color: "#5C9E93", values: rows.map((r) => r.sideYen) },
          { label: t(lang, "childAllowance"), color: "#C9A227", values: rows.map((r) => r.allowanceYen) },
          {
            label: t(lang, "specialIncomeLabel"),
            color: "#6B8F71",
            values: rows.map((r) => r.specialIncomeYen),
            breakdown: specialBreakdownByRow(rows, "income", specialEntries, vndPerJpy),
          },
        ]),
      };
    case "life": {
      const fixedSeries = (first?.fixedByCategory ?? []).map((c) => ({
        label: catLabel(lang, c.name),
        color: c.color,
        values: rows.map((r) => r.fixedByCategory.find((fc) => fc.id === c.id)?.valueYen ?? 0),
      }));
      const varSeries = (first?.variableByCategory ?? []).map((c) => ({
        label: catLabel(lang, c.name),
        color: c.color,
        values: rows.map((r) => r.variableByCategory.find((vc) => vc.id === c.id)?.valueYen ?? 0),
      }));
      return {
        years,
        stacked: true,
        total: { label: t(lang, "life"), values: rows.map((r) => r.fixedTotalYen + r.variableTotalYen) },
        series: dropAllZero([...fixedSeries, ...varSeries]),
      };
    }
    case "expenseTotal":
      // 設定モーダルの支出タブと同じ5項目(固定費/変動費/教育/イベント/特別支出)。
      // イベントは結婚式・旅行のみ(特別支出は別系列にして二重計上を避ける)。
      // 年間を通じて¥0の項目は表示しない。
      return {
        years,
        stacked: true,
        total: { label: t(lang, "totalExpense"), values: rows.map((r) => r.expenseTotalYen) },
        series: dropAllZero([
          { label: t(lang, "fixed"), color: "#B8621B", values: rows.map((r) => r.fixedTotalYen) },
          { label: t(lang, "variable"), color: "#C77B3D", values: rows.map((r) => r.variableTotalYen) },
          { label: t(lang, "education"), color: "#8C3A5E", values: rows.map((r) => r.educationTotalYen) },
          { label: t(lang, "events"), color: "#5C7A99", values: rows.map((r) => r.eventsTotalYen - r.specialExpenseYen) },
          {
            label: t(lang, "specialExpenseLabel"),
            color: "#A66B8E",
            values: rows.map((r) => r.specialExpenseYen),
            breakdown: specialBreakdownByRow(rows, "expense", specialEntries, vndPerJpy),
          },
        ]),
      };
    case "savings":
      return {
        years,
        stacked: true,
        total: { label: t(lang, "totalSavings"), values: rows.map((r) => r.savingsCumTotalYen) },
        series: [
          { label: t(lang, "cash"), color: "#8A8172", values: rows.map((r) => r.cashCumYen) },
          { label: t(lang, "invest"), color: "#4C6B8A", values: rows.map((r) => r.investBalYen) },
        ],
      };
  }
}

const COMPARE_COLORS = ["#BE5B85", "#4C6B8A", "#16A34A", "#B8621B"];

export function buildCompareChartSeries(
  scenarioRows: { name: string; rows: ScenarioRow[] }[],
): ChartBundle {
  const series = scenarioRows.map((s, i) => ({
    label: s.name,
    color: COMPARE_COLORS[i % COMPARE_COLORS.length],
    values: s.rows.map((r) => r.savingsCumTotalYen),
  }));
  const years = scenarioRows[0]?.rows.map((r) => r.yearLabel) ?? [];
  return { years, stacked: false, series };
}
