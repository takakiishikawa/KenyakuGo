import { DAM_START } from "./constants";
import type { MonthlyBudget } from "./budget";
import { monthKey } from "./budget";

interface TxForDam {
  amount: number;
  date: string;
}

interface DamCalcOptions {
  txs: TxForDam[];
  budgetMap: Map<string, MonthlyBudget>;
  defaultBudget?: { target_monthly: number; fixed_costs: number };
  now?: Date;
}

interface MonthBalance {
  key: string; // "YYYY-MM"
  year: number;
  month: number; // 0-indexed
  target: number;
  fixedCosts: number;
  spent: number;
  projected: number;
  balance: number;
  cumulative: number;
}

/**
 * DAM_START から現在月までの月次残高を計算する。
 * 月ごとに budget が異なる場合に対応（monthly_budgets テーブル前提）。
 */
export function calcDamMonths(opts: DamCalcOptions): MonthBalance[] {
  const {
    txs,
    budgetMap,
    defaultBudget = { target_monthly: 0, fixed_costs: 0 },
    now = new Date(),
  } = opts;

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  // 月ごとの支出を集計
  const spendMap: Record<string, number> = {};
  for (const tx of txs) {
    const d = new Date(tx.date);
    const key = monthKey(d.getFullYear(), d.getMonth());
    spendMap[key] = (spendMap[key] ?? 0) + tx.amount;
  }

  const months: MonthBalance[] = [];
  let cursor = new Date(DAM_START);
  let cumulative = 0;

  while (cursor <= now) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const key = monthKey(year, month);
    const budget = budgetMap.get(key) ?? {
      target_monthly: defaultBudget.target_monthly,
      fixed_costs: defaultBudget.fixed_costs,
    };
    const target = budget.target_monthly;
    const fixedCosts = budget.fixed_costs;

    const spent = spendMap[key] ?? 0;
    const isCurrent = year === now.getFullYear() && month === now.getMonth();

    let projected: number;
    if (isCurrent && spent > 0) {
      const variableSpend = Math.max(0, spent - fixedCosts);
      projected = Math.round(
        fixedCosts + (variableSpend / dayOfMonth) * daysInMonth,
      );
    } else {
      projected = spent;
    }

    const balance = target - projected;
    cumulative += balance;
    months.push({
      key,
      year,
      month,
      target,
      fixedCosts,
      spent,
      projected,
      balance,
      cumulative,
    });
    cursor = new Date(year, month + 1, 1);
  }

  return months;
}

/** DAM_START ラベル文字列（例: "2026年4月"） */
export const DAM_START_LABEL = `${DAM_START.getFullYear()}年${DAM_START.getMonth() + 1}月`;
