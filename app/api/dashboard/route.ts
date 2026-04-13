import { NextResponse } from "next/server";
import { createDb, type Transaction, type Settings } from "@/lib/supabase/db";

export async function GET() {
  const db = createDb();
  const now = new Date();

  // 直近7日間（今日を含む）とその前の7日間
  const last7End = new Date(now);
  last7End.setHours(23, 59, 59, 999);

  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 6);
  last7Start.setHours(0, 0, 0, 0);

  const prev7End = new Date(last7Start);
  prev7End.setMilliseconds(prev7End.getMilliseconds() - 1);

  const prev7Start = new Date(prev7End);
  prev7Start.setDate(prev7Start.getDate() - 6);
  prev7Start.setHours(0, 0, 0, 0);

  // 今月
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [last7Res, prev7Res, thisMonthRes, recentRes, settingsRes] = await Promise.all([
    db.from("transactions").select("amount, category")
      .gte("date", last7Start.toISOString()).lte("date", last7End.toISOString()),
    db.from("transactions").select("amount")
      .gte("date", prev7Start.toISOString()).lte("date", prev7End.toISOString()),
    db.from("transactions").select("amount")
      .gte("date", monthStart.toISOString()).lte("date", monthEnd.toISOString()),
    db.from("transactions").select("id, store, amount, category, date")
      .order("date", { ascending: false }).limit(5),
    db.from("settings").select("target_monthly").eq("id", "singleton").maybeSingle(),
  ]);

  const firstError = last7Res.error ?? prev7Res.error ?? thisMonthRes.error ?? recentRes.error;
  if (firstError) {
    console.error("[dashboard] DB error:", firstError);
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const last7Txs = (last7Res.data ?? []) as Pick<Transaction, "amount" | "category">[];
  const prev7Txs = (prev7Res.data ?? []) as Pick<Transaction, "amount">[];
  const thisMonthTxs = (thisMonthRes.data ?? []) as Pick<Transaction, "amount">[];
  const recentTxs = (recentRes.data ?? []) as Pick<Transaction, "id" | "store" | "amount" | "category" | "date">[];
  const settings = settingsRes.data as Pick<Settings, "target_monthly"> | null;

  const thisMonthTotal = thisMonthTxs.reduce((s, t) => s + t.amount, 0);
  const last7Total = last7Txs.reduce((s, t) => s + t.amount, 0);
  const prev7Total = prev7Txs.reduce((s, t) => s + t.amount, 0);

  const weekDiff = prev7Total > 0
    ? Math.round(((last7Total - prev7Total) / prev7Total) * 100)
    : 0;

  const targetMonthly = settings?.target_monthly ?? 0;
  const damBalance = targetMonthly - thisMonthTotal;

  const categoryMap: Record<string, number> = {};
  for (const tx of last7Txs) {
    categoryMap[tx.category] = (categoryMap[tx.category] ?? 0) + tx.amount;
  }
  const categoryBreakdown = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  return NextResponse.json({
    thisMonthTotal,
    thisWeekTotal: last7Total,
    lastWeekTotal: prev7Total,
    weekDiff,
    damBalance,
    targetMonthly,
    categoryBreakdown,
    recentTransactions: recentTxs,
  });
}
