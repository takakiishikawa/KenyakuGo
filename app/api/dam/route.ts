import { NextResponse } from "next/server";
import { createDb, type Transaction, type Settings } from "@/lib/supabase/db";

// ダムの積み立て開始月（2026年4月）
const DAM_START = new Date(2026, 3, 1); // 月は0始まり

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export interface MonthRecord {
  key: string;       // "2026-04"
  label: string;     // "2026年4月"
  target: number;
  spent: number;
  balance: number;   // target - spent（正=節約、負=超過）
  cumulative: number;
}

export async function GET() {
  const db = createDb();
  const now = new Date();

  const [txRes, settingsRes] = await Promise.all([
    db
      .from("transactions")
      .select("amount, date")
      .gt("amount", 0)
      .gte("date", DAM_START.toISOString())
      .limit(100000),
    db.from("settings").select("target_monthly").eq("id", "singleton").maybeSingle(),
  ]);

  const txs = (txRes.data ?? []) as Pick<Transaction, "amount" | "date">[];
  const settings = settingsRes.data as Pick<Settings, "target_monthly"> | null;
  const targetMonthly = settings?.target_monthly ?? 50_000_000;

  // 月ごとの支出を集計
  const spendMap: Record<string, number> = {};
  for (const tx of txs) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    spendMap[key] = (spendMap[key] ?? 0) + tx.amount;
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
    const balance = targetMonthly - spent;
    cumulative += balance;

    months.push({ key, label, target: targetMonthly, spent, balance, cumulative });

    // 次の月へ
    cursor = new Date(year, month + 1, 1);
  }

  const currentMonthRecord = months[months.length - 1];
  const thisMonthTotal = currentMonthRecord?.spent ?? 0;
  const currentBalance = currentMonthRecord?.balance ?? 0;
  const cumulativeBalance = cumulative;

  const achievementRate =
    targetMonthly > 0
      ? Math.max(0, Math.min(Math.round((currentBalance / targetMonthly) * 100), 100))
      : 0;

  // ダム水位: 累計が targetMonthly*months.length の何%か（最大100%）
  const totalPossible = targetMonthly * months.length;
  const damLevel = totalPossible > 0
    ? Math.max(0, Math.min(Math.round((cumulativeBalance / totalPossible) * 100), 100))
    : 0;

  return NextResponse.json({
    targetMonthly,
    thisMonthTotal,
    currentBalance,
    achievementRate,
    cumulativeBalance,
    damLevel,
    months,
    damStartLabel: `${DAM_START.getFullYear()}年${DAM_START.getMonth() + 1}月`,
  });
}
