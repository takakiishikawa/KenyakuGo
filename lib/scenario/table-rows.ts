import type { ScenarioRow } from "./compute";
import { catLabel, t, type Lang } from "./dictionary";

export interface TableCell {
  fmt: string;
  negative: boolean;
  color: string;
}

export interface TableRow {
  key: string;
  depth: number;
  label: string;
  cells: TableCell[];
  bold: boolean;
  expandable: boolean;
  expanded: boolean;
}

function cell(v: number, fmt: (n: number) => string, isNeg = false): TableCell {
  return { fmt: fmt(v), negative: isNeg && v < 0, color: isNeg && v < 0 ? "#C0392B" : "inherit" };
}

// 3階層: 総収入/総支出/総貯蓄 → 内訳 → (支出のみ)カテゴリ単位。
export function buildSingleTableRows(
  rows: ScenarioRow[],
  lang: Lang,
  isExpanded: (key: string) => boolean,
  fmt: (n: number) => string,
): TableRow[] {
  const first = rows[0];
  const out: TableRow[] = [];
  const push = (r: Omit<TableRow, "expanded" | "bold" | "expandable"> & Partial<Pick<TableRow, "bold" | "expandable">>) =>
    out.push({ bold: false, expandable: false, expanded: isExpanded(r.key), ...r });

  push({
    key: "income",
    depth: 0,
    label: t(lang, "totalIncome"),
    cells: rows.map((r) => cell(r.incomeTotalYen, fmt)),
    expandable: true,
  });
  if (isExpanded("income")) {
    push({ key: "income.husband", depth: 1, label: t(lang, "husband"), cells: rows.map((r) => cell(r.husbandYen, fmt)) });
    push({ key: "income.wife", depth: 1, label: t(lang, "wife"), cells: rows.map((r) => cell(r.wifeYen, fmt)) });
    push({ key: "income.side", depth: 1, label: t(lang, "side"), cells: rows.map((r) => cell(r.sideYen, fmt)) });
    push({ key: "income.allowance", depth: 1, label: t(lang, "childAllowance"), cells: rows.map((r) => cell(r.allowanceYen, fmt)) });
  }

  push({
    key: "expense",
    depth: 0,
    label: t(lang, "totalExpense"),
    cells: rows.map((r) => cell(r.expenseTotalYen, fmt)),
    expandable: true,
  });
  if (isExpanded("expense")) {
    push({
      key: "expense.fixed",
      depth: 1,
      label: t(lang, "fixed"),
      cells: rows.map((r) => cell(r.fixedTotalYen, fmt)),
      expandable: true,
    });
    if (isExpanded("expense.fixed")) {
      for (const c of first?.fixedByCategory ?? []) {
        push({
          key: `expense.fixed.${c.id}`,
          depth: 2,
          label: catLabel(lang, c.name),
          cells: rows.map((r) => cell(r.fixedByCategory.find((fc) => fc.id === c.id)?.valueYen ?? 0, fmt)),
        });
      }
    }
    push({
      key: "expense.variable",
      depth: 1,
      label: t(lang, "variable"),
      cells: rows.map((r) => cell(r.variableTotalYen, fmt)),
      expandable: true,
    });
    if (isExpanded("expense.variable")) {
      for (const c of first?.variableByCategory ?? []) {
        push({
          key: `expense.variable.${c.id}`,
          depth: 2,
          label: catLabel(lang, c.name),
          cells: rows.map((r) => cell(r.variableByCategory.find((vc) => vc.id === c.id)?.valueYen ?? 0, fmt)),
        });
      }
    }
    push({ key: "expense.education", depth: 1, label: t(lang, "education"), cells: rows.map((r) => cell(r.educationTotalYen, fmt)) });
    push({ key: "expense.events", depth: 1, label: t(lang, "events"), cells: rows.map((r) => cell(r.eventsTotalYen, fmt)) });
  }

  push({
    key: "savings",
    depth: 0,
    label: t(lang, "totalSavings"),
    cells: rows.map((r) => cell(r.savingsCumTotalYen, fmt, true)),
    bold: true,
    expandable: true,
  });
  if (isExpanded("savings")) {
    push({ key: "savings.cash", depth: 1, label: t(lang, "cash"), cells: rows.map((r) => cell(r.cashCumYen, fmt, true)) });
    push({
      key: "savings.invest",
      depth: 1,
      label: t(lang, "invest"),
      cells: rows.map((r) => cell(r.investBalYen - r.profitCumYen, fmt)),
    });
    push({ key: "savings.profit", depth: 1, label: t(lang, "profit"), cells: rows.map((r) => cell(r.profitCumYen, fmt)) });
  }

  return out;
}

// 比較モード: シナリオ名+総貯蓄 → 総収入/総支出/総貯蓄内訳 → 支出は固定費/変動費まで。
export function buildCompareTableRows(
  scenarioRows: { id: string; name: string; rows: ScenarioRow[] }[],
  lang: Lang,
  isExpanded: (key: string) => boolean,
  fmt: (n: number) => string,
): TableRow[] {
  const out: TableRow[] = [];
  const push = (r: Omit<TableRow, "expanded" | "bold" | "expandable"> & Partial<Pick<TableRow, "bold" | "expandable">>) =>
    out.push({ bold: false, expandable: false, expanded: isExpanded(r.key), ...r });

  for (const scn of scenarioRows) {
    const key = `scn.${scn.id}`;
    push({
      key,
      depth: 0,
      label: scn.name,
      cells: scn.rows.map((r) => cell(r.savingsCumTotalYen, fmt, true)),
      bold: true,
      expandable: true,
    });
    if (!isExpanded(key)) continue;
    push({ key: `${key}.income`, depth: 1, label: t(lang, "totalIncome"), cells: scn.rows.map((r) => cell(r.incomeTotalYen, fmt)) });
    const ek = `${key}.expense`;
    push({ key: ek, depth: 1, label: t(lang, "totalExpense"), cells: scn.rows.map((r) => cell(r.expenseTotalYen, fmt)), expandable: true });
    if (isExpanded(ek)) {
      push({ key: `${ek}.fixed`, depth: 2, label: t(lang, "fixed"), cells: scn.rows.map((r) => cell(r.fixedTotalYen, fmt)) });
      push({ key: `${ek}.variable`, depth: 2, label: t(lang, "variable"), cells: scn.rows.map((r) => cell(r.variableTotalYen, fmt)) });
    }
    push({ key: `${key}.cash`, depth: 1, label: t(lang, "cash"), cells: scn.rows.map((r) => cell(r.cashCumYen, fmt, true)) });
    push({
      key: `${key}.invest`,
      depth: 1,
      label: t(lang, "invest"),
      cells: scn.rows.map((r) => cell(r.investBalYen - r.profitCumYen, fmt)),
    });
    push({ key: `${key}.profit`, depth: 1, label: t(lang, "profit"), cells: scn.rows.map((r) => cell(r.profitCumYen, fmt)) });
  }

  return out;
}
