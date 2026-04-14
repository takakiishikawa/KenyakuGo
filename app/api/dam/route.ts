import { NextResponse } from "next/server";
import { createDb, type Transaction, type Settings } from "@/lib/supabase/db";

// ダムの積み立て開始月（2026年4月）
const DAM_START = new Date(2026, 3, 1);

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export interface MonthRecord {
  key: string;
  label: string;
  target: number;
  spent: number;
  projected: number;    // 月末予測支出
  balance: number;      // target - projected
  cumulative: number;
}

export async function GET() {
  const db = createDb();
  const now = new Date();

  const thisMonth = getMonthRange(now.getFullYear(), now.getMonth());

  const [txRes, thisMonthCatRes, settingsRes] = await Promise.all([
    db
      .from("transactions")
      .select("amount, date")
      .gt("amount", 0)
      .gte("date", DAM_START.toISOString())
      .limit(100000),
    // 今月のカテゴリ別支出（AIコメント用）
    db
      .from("transactions")
      .select("amount, category")
      .gt("amount", 0)
      .gte("date", thisMonth.start.toISOString())
      .lte("date", thisMonth.end.toISOString())
      .limit(1000),
    db.from("settings").select("target_monthly, fixed_costs").eq("id", "singleton").maybeSingle(),
  ]);

  const txs = (txRes.data ?? []) as Pick<Transaction, "amount" | "date">[];
  const thisMonthCatTxs = (thisMonthCatRes.data ?? []) as Pick<Transaction, "amount" | "category">[];
  const settings = settingsRes.data as Pick<Settings, "target_monthly" | "fixed_costs"> | null;

  const targetMonthly = settings?.target_monthly ?? 50_000_000;
  const fixedCosts = settings?.fixed_costs ?? 0;

  // 月末予測の計算（今月分のみ、過去月は実績確定）
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // 月ごとの支出を集計
  const spendMap: Record<string, number> = {};
  for (const tx of txs) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    spendMap[key] = (spendMap[key] ?? 0) + tx.amount;
  }

  // カテゴリ別集計（AIコメント用）
  const categoryBreakdown: Record<string, number> = {};
  for (const tx of thisMonthCatTxs) {
    categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] ?? 0) + tx.amount;
  }

  // ダム開始月から今月までの月リストを生成
  const months: MonthRecord[] = [];
  let cursor = new Date(DAM_START);
  let cumulative = 0;

  while (cursor <= now) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const label = `${year}年${month + 1}月`;
    const spent = spendMap[key] ?? 0;
    const isCurrent = year === now.getFullYear() && month === now.getMonth();

    let projected: number;
    if (isCurrent && spent > 0) {
      // 今月: 固定費除いた変動費からペース推計
      const variableSpend = Math.max(0, spent - fixedCosts);
      projected = Math.round(fixedCosts + (variableSpend / dayOfMonth) * daysInMonth);
    } else {
      // 過去月: 実績確定
      projected = spent;
    }

    const balance = targetMonthly - projected;
    cumulative += balance;

    months.push({ key, label, target: targetMonthly, spent, projected, balance, cumulative });
    cursor = new Date(year, month + 1, 1);
  }

  const currentMonthRecord = months[months.length - 1];
  const thisMonthTotal = currentMonthRecord?.spent ?? 0;
  const projectedMonthTotal = currentMonthRecord?.projected ?? 0;
  const currentBalance = currentMonthRecord?.balance ?? 0; // target - projected
  const cumulativeBalance = cumulative;

  // 今月達成率: 予測ベース（節約できている割合）
  const achievementRate =
    targetMonthly > 0
      ? Math.max(0, Math.min(Math.round((currentBalance / targetMonthly) * 100), 100))
      : 0;

  // ダム水位: 累計残高 / 全期間の最大可能節約額
  const totalPossible = targetMonthly * months.length;
  const damLevel = totalPossible > 0
    ? Math.max(0, Math.min(Math.round((cumulativeBalance / totalPossible) * 100), 100))
    : 0;

  return NextResponse.json({
    targetMonthly,
    fixedCosts,
    thisMonthTotal,
    projectedMonthTotal,
    currentBalance,
    achievementRate,
    cumulativeBalance,
    damLevel,
    months,
    categoryBreakdown,
    damStartLabel: `${DAM_START.getFullYear()}年${DAM_START.getMonth() + 1}月`,
  });
}
