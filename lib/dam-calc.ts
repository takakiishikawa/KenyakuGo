import { DAM_START } from "./constants";

interface TxForDam {
  amount: number;
  date: string;
}

interface DamCalcOptions {
  txs: TxForDam[];
  targetMonthly: number;
  fixedCosts: number;
  now?: Date;
}

interface MonthBalance {
  key: string; // "YYYY-MM"
  year: number;
  month: number; // 0-indexed
  spent: number;
  projected: number;
  balance: number; // targetMonthly - projected
  cumulative: number;
}

/**
 * DAM_START から現在月までの月次残高を計算する。
 * dam/route.ts と dashboard/route.ts で同じロジックを使う。
 */
export function calcDamMonths(opts: DamCalcOptions): MonthBalance[] {
  const { txs, targetMonthly, fixedCosts, now = new Date() } = opts;

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
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    spendMap[key] = (spendMap[key] ?? 0) + tx.amount;
  }

  const months: MonthBalance[] = [];
  let cursor = new Date(DAM_START);
  let cumulative = 0;

  while (cursor <= now) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
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

    const balance = targetMonthly - projected;
    cumulative += balance;
    months.push({ key, year, month, spent, projected, balance, cumulative });
    cursor = new Date(year, month + 1, 1);
  }

  return months;
}

/** DAM_START ラベル文字列（例: "2026年4月"） */
export const DAM_START_LABEL = `${DAM_START.getFullYear()}年${DAM_START.getMonth() + 1}月`;
