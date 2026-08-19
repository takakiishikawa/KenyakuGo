import type { ScenarioRow } from "./compute";
import { catLabel, t, type Lang } from "./dictionary";

export type ChartKind =
  | "overview"
  | "income"
  | "life"
  | "education"
  | "events"
  | "expenseTotal"
  | "savings";

export const CHART_KINDS: ChartKind[] = [
  "overview",
  "income",
  "life",
  "education",
  "events",
  "expenseTotal",
  "savings",
];

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

export interface ChartBundle {
  years: string[];
  stacked: boolean;
  series: ChartSeries[];
}

export function chartKindLabel(lang: Lang, kind: ChartKind): string {
  switch (kind) {
    case "overview":
      return t(lang, "overview");
    case "income":
      return t(lang, "incomeBreakdown");
    case "life":
      return t(lang, "lifeBreakdown");
    case "education":
      return t(lang, "educationBreakdown");
    case "events":
      return t(lang, "eventsBreakdown");
    case "expenseTotal":
      return t(lang, "expenseTotal");
    case "savings":
      return t(lang, "savingsBreakdown");
  }
}

export function buildChartSeries(rows: ScenarioRow[], kind: ChartKind, lang: Lang): ChartBundle {
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
          { label: t(lang, "totalSavings"), color: "#BE5B85", values: rows.map((r) => r.netFlowYen) },
        ],
      };
    case "income":
      return {
        years,
        stacked: true,
        series: [
          { label: t(lang, "husband"), color: "#4C6B8A", values: rows.map((r) => r.husbandYen) },
          { label: t(lang, "wife"), color: "#8B5E83", values: rows.map((r) => r.wifeYen) },
          { label: t(lang, "side"), color: "#5C9E93", values: rows.map((r) => r.sideYen) },
        ],
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
      return { years, stacked: true, series: [...fixedSeries, ...varSeries] };
    }
    case "education":
      return {
        years,
        stacked: false,
        series: [{ label: t(lang, "education"), color: "#8C3A5E", values: rows.map((r) => r.educationTotalYen) }],
      };
    case "events":
      return {
        years,
        stacked: false,
        series: [{ label: t(lang, "events"), color: "#5C7A99", values: rows.map((r) => r.eventsTotalYen) }],
      };
    case "expenseTotal":
      return {
        years,
        stacked: true,
        series: [
          { label: t(lang, "life"), color: "#B8621B", values: rows.map((r) => r.fixedTotalYen + r.variableTotalYen) },
          { label: t(lang, "education"), color: "#8C3A5E", values: rows.map((r) => r.educationTotalYen) },
          { label: t(lang, "events"), color: "#5C7A99", values: rows.map((r) => r.eventsTotalYen) },
        ],
      };
    case "savings":
      return {
        years,
        stacked: true,
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
