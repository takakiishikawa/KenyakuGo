import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { type Transaction, type Settings } from "@/lib/supabase/db";
import { calcDamMonths, DAM_START_LABEL } from "@/lib/dam-calc";
import { DAM_START } from "@/lib/constants";

export interface MonthRecord {
  key: string;
  label: string;
  target: number;
  spent: number;
  projected: number;
  balance: number;
  cumulative: number;
}

export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const [txRes, thisMonthCatRes, settingsRes] = await Promise.all([
    db
      .from("transactions")
      .select("amount, date")
      .gt("amount", 0)
      .gte("date", DAM_START.toISOString())
      .limit(100000),
    db
      .from("transactions")
      .select("amount, category")
      .gt("amount", 0)
      .gte("date", thisMonthStart.toISOString())
      .lte("date", thisMonthEnd.toISOString())
      .limit(1000),
    db
      .from("settings")
      .select("target_monthly, fixed_costs")
      .eq("id", "singleton")
      .maybeSingle(),
  ]);

  const txs = (txRes.data ?? []) as Pick<Transaction, "amount" | "date">[];
  const thisMonthCatTxs = (thisMonthCatRes.data ?? []) as Pick<
    Transaction,
    "amount" | "category"
  >[];
  const settings = settingsRes.data as Pick<
    Settings,
    "target_monthly" | "fixed_costs"
  > | null;

  const targetMonthly = settings?.target_monthly ?? 50_000_000;
  const fixedCosts = settings?.fixed_costs ?? 0;

  const months = calcDamMonths({ txs, targetMonthly, fixedCosts, now });

  // カテゴリ別集計（AIコメント用）
  const categoryBreakdown: Record<string, number> = {};
  for (const tx of thisMonthCatTxs) {
    categoryBreakdown[tx.category] =
      (categoryBreakdown[tx.category] ?? 0) + tx.amount;
  }

  const currentMonthRecord = months[months.length - 1];
  const thisMonthTotal = currentMonthRecord?.spent ?? 0;
  const projectedMonthTotal = currentMonthRecord?.projected ?? 0;
  const currentBalance = currentMonthRecord?.balance ?? 0;
  const cumulativeBalance = currentMonthRecord?.cumulative ?? 0;

  const achievementRate =
    targetMonthly > 0
      ? Math.max(
          0,
          Math.min(Math.round((currentBalance / targetMonthly) * 100), 100),
        )
      : 0;

  const totalPossible = targetMonthly * months.length;
  const damLevel =
    totalPossible > 0
      ? Math.max(
          0,
          Math.min(Math.round((cumulativeBalance / totalPossible) * 100), 100),
        )
      : 0;

  const monthRecords: MonthRecord[] = months.map((m) => ({
    key: m.key,
    label: `${m.year}年${m.month + 1}月`,
    target: targetMonthly,
    spent: m.spent,
    projected: m.projected,
    balance: m.balance,
    cumulative: m.cumulative,
  }));

  return NextResponse.json({
    targetMonthly,
    fixedCosts,
    thisMonthTotal,
    projectedMonthTotal,
    currentBalance,
    achievementRate,
    cumulativeBalance,
    damLevel,
    months: monthRecords,
    categoryBreakdown,
    damStartLabel: DAM_START_LABEL,
  });
}
