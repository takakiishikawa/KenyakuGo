import type { ScenarioRow } from "./compute";
import { catLabel, t, type Lang } from "./dictionary";

export interface TableCell {
  fmt: string;
  negative: boolean;
  color: string;
  // その期間(年/月)ぶんの増減。総貯蓄の行にだけ付けて、プラス/マイナスが
  // ひと目でわかるようにする。
  delta?: { fmt: string; positive: boolean };
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

// 総貯蓄の行専用: その期間の増減(netFlowYen、投資益込み)を「+」符号付きで
// 添える。マイナスの時は fmt() 側が既に「-」を付けてくれる。
function cellWithDelta(v: number, deltaV: number, fmt: (n: number) => string, isNeg = false): TableCell {
  const base = cell(v, fmt, isNeg);
  const positive = deltaV >= 0;
  return { ...base, delta: { fmt: `${positive ? "+" : ""}${fmt(deltaV)}`, positive } };
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
    // 投資益は収入の内訳には出さず、貯蓄→投資の行にその期間の増分として表示する
    // (収入の内訳に混ざっていると「収支」と「運用の増減」が紛らわしいため)。
    push({ key: "income.allowance", depth: 1, label: t(lang, "childAllowance"), cells: rows.map((r) => cell(r.allowanceYen, fmt)) });
    push({
      key: "income.specialIncome",
      depth: 1,
      label: t(lang, "specialIncomeLabel"),
      cells: rows.map((r) => cell(r.specialIncomeYen, fmt)),
    });
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
    push({
      key: "expense.events",
      depth: 1,
      label: t(lang, "events"),
      cells: rows.map((r) => cell(r.eventsTotalYen - r.specialExpenseYen, fmt)),
    });
    push({
      key: "expense.specialExpense",
      depth: 1,
      label: t(lang, "specialExpenseLabel"),
      cells: rows.map((r) => cell(r.specialExpenseYen, fmt)),
    });
  }

  push({
    key: "savings",
    depth: 0,
    label: t(lang, "totalSavings"),
    // netFlowYen(投資益込みの総収入-総支出)が、そのままその期間の貯蓄の増減と
    // 一致する(収支の計算上、他に貯蓄額を動かす要因が無いため)。
    cells: rows.map((r) => cellWithDelta(r.savingsCumTotalYen, r.netFlowYen, fmt, true)),
    bold: true,
    expandable: true,
  });
  if (isExpanded("savings")) {
    push({ key: "savings.cash", depth: 1, label: t(lang, "cash"), cells: rows.map((r) => cell(r.cashCumYen, fmt, true)) });
    // 投資残高の増減(投資益、想定利率から毎月/毎年計算)を、貯蓄の行と同じ
    // 「金額 + その期間の増減」の書き方で見せる。
    push({
      key: "savings.invest",
      depth: 1,
      label: t(lang, "invest"),
      cells: rows.map((r) => cellWithDelta(r.investBalYen, r.investProfitYen, fmt)),
    });
  }

  return out;
}

// 比較モード: シナリオ名+総貯蓄 → 総収入(内訳込み)/総支出(固定費・変動費の
// カテゴリ内訳・教育・イベント込み)/現金・投資 という、単体モードと同じ内容を
// シナリオごとに出す。
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
    const first = scn.rows[0];
    push({
      key,
      depth: 0,
      label: scn.name,
      cells: scn.rows.map((r) => cellWithDelta(r.savingsCumTotalYen, r.netFlowYen, fmt, true)),
      bold: true,
      expandable: true,
    });
    if (!isExpanded(key)) continue;

    const ik = `${key}.income`;
    push({ key: ik, depth: 1, label: t(lang, "totalIncome"), cells: scn.rows.map((r) => cell(r.incomeTotalYen, fmt)), expandable: true });
    if (isExpanded(ik)) {
      push({ key: `${ik}.husband`, depth: 2, label: t(lang, "husband"), cells: scn.rows.map((r) => cell(r.husbandYen, fmt)) });
      push({ key: `${ik}.wife`, depth: 2, label: t(lang, "wife"), cells: scn.rows.map((r) => cell(r.wifeYen, fmt)) });
      push({ key: `${ik}.side`, depth: 2, label: t(lang, "side"), cells: scn.rows.map((r) => cell(r.sideYen, fmt)) });
      push({ key: `${ik}.allowance`, depth: 2, label: t(lang, "childAllowance"), cells: scn.rows.map((r) => cell(r.allowanceYen, fmt)) });
      push({
        key: `${ik}.specialIncome`,
        depth: 2,
        label: t(lang, "specialIncomeLabel"),
        cells: scn.rows.map((r) => cell(r.specialIncomeYen, fmt)),
      });
    }

    const ek = `${key}.expense`;
    push({ key: ek, depth: 1, label: t(lang, "totalExpense"), cells: scn.rows.map((r) => cell(r.expenseTotalYen, fmt)), expandable: true });
    if (isExpanded(ek)) {
      const fk = `${ek}.fixed`;
      push({ key: fk, depth: 2, label: t(lang, "fixed"), cells: scn.rows.map((r) => cell(r.fixedTotalYen, fmt)), expandable: true });
      if (isExpanded(fk)) {
        for (const c of first?.fixedByCategory ?? []) {
          push({
            key: `${fk}.${c.id}`,
            depth: 3,
            label: catLabel(lang, c.name),
            cells: scn.rows.map((r) => cell(r.fixedByCategory.find((fc) => fc.id === c.id)?.valueYen ?? 0, fmt)),
          });
        }
      }
      const vk = `${ek}.variable`;
      push({ key: vk, depth: 2, label: t(lang, "variable"), cells: scn.rows.map((r) => cell(r.variableTotalYen, fmt)), expandable: true });
      if (isExpanded(vk)) {
        for (const c of first?.variableByCategory ?? []) {
          push({
            key: `${vk}.${c.id}`,
            depth: 3,
            label: catLabel(lang, c.name),
            cells: scn.rows.map((r) => cell(r.variableByCategory.find((vc) => vc.id === c.id)?.valueYen ?? 0, fmt)),
          });
        }
      }
      push({ key: `${ek}.education`, depth: 2, label: t(lang, "education"), cells: scn.rows.map((r) => cell(r.educationTotalYen, fmt)) });
      push({
        key: `${ek}.events`,
        depth: 2,
        label: t(lang, "events"),
        cells: scn.rows.map((r) => cell(r.eventsTotalYen - r.specialExpenseYen, fmt)),
      });
      push({
        key: `${ek}.specialExpense`,
        depth: 2,
        label: t(lang, "specialExpenseLabel"),
        cells: scn.rows.map((r) => cell(r.specialExpenseYen, fmt)),
      });
    }

    push({ key: `${key}.cash`, depth: 1, label: t(lang, "cash"), cells: scn.rows.map((r) => cell(r.cashCumYen, fmt, true)) });
    push({
      key: `${key}.invest`,
      depth: 1,
      label: t(lang, "invest"),
      cells: scn.rows.map((r) => cellWithDelta(r.investBalYen, r.investProfitYen, fmt)),
    });
  }

  return out;
}
