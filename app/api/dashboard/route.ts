import { NextResponse } from "next/server";
import { createDb, type Transaction, type Settings } from "@/lib/supabase/db";

function getWeekRange(date: Date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET() {
  const db = createDb();
  const now = new Date();
  const thisWeek = getWeekRange(now);
  const lastWeekStart = new Date(thisWeek.start);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeek.end);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  const thisMonth = getMonthRange(now);

  const [thisWeekRes, lastWeekRes, thisMonthRes, recentRes, settingsRes] =
    await Promise.all([
      db
        .from("transactions")
        .select("amount, category")
        .gte("date", thisWeek.start.toISOString())
        .lte("date", thisWeek.end.toISOString()),
      db
        .from("transactions")
        .select("amount")
        .gte("date", lastWeekStart.toISOString())
        .lte("date", lastWeekEnd.toISOString()),
      db
        .from("transactions")
        .select("amount")
        .gte("date", thisMonth.start.toISOString())
        .lte("date", thisMonth.end.toISOString()),
      db
        .from("transactions")
        .select("id, store, amount, category, date")
        .order("date", { ascending: false })
        .limit(5),
      db.from("settings").select("target_monthly").eq("id", "singleton").maybeSingle(),
    ]);

  // エラーがあれば早期リターン（原因特定用）
  const firstError = thisWeekRes.error ?? lastWeekRes.error ?? thisMonthRes.error ?? recentRes.error;
  if (firstError) {
    console.error("[dashboard] DB error:", firstError);
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const thisWeekTxs = (thisWeekRes.data ?? []) as Pick<Transaction, "amount" | "category">[];
  const lastWeekTxs = (lastWeekRes.data ?? []) as Pick<Transaction, "amount">[];
  const thisMonthTxs = (thisMonthRes.data ?? []) as Pick<Transaction, "amount">[];
  const recentTxs = (recentRes.data ?? []) as Pick<Transaction, "id" | "store" | "amount" | "category" | "date">[];
  const settings = settingsRes.data as Pick<Settings, "target_monthly"> | null;

  const thisMonthTotal = thisMonthTxs.reduce((s, t) => s + t.amount, 0);
  const thisWeekTotal = thisWeekTxs.reduce((s, t) => s + t.amount, 0);
  const lastWeekTotal = lastWeekTxs.reduce((s, t) => s + t.amount, 0);

  const weekDiff =
    lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : 0;

  const targetMonthly = settings?.target_monthly ?? 0;
  const damBalance = targetMonthly - thisMonthTotal;

  const categoryMap: Record<string, number> = {};
  for (const tx of thisWeekTxs) {
    categoryMap[tx.category] = (categoryMap[tx.category] ?? 0) + tx.amount;
  }
  const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  return NextResponse.json({
    thisMonthTotal,
    thisWeekTotal,
    lastWeekTotal,
    weekDiff,
    damBalance,
    targetMonthly,
    categoryBreakdown,
    recentTransactions: recentTxs,
  });
}
