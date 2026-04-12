import { NextResponse } from "next/server";
import { createDb, type Transaction } from "@/lib/supabase/db";

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

export async function GET() {
  const db = createDb();
  const now = new Date();
  const thisWeek = getWeekRange(now);
  const lastWeekStart = new Date(thisWeek.start);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeek.end);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const [thisWeekRes, lastWeekRes] = await Promise.all([
    db
      .from("transactions")
      .select("category, amount")
      .gte("date", thisWeek.start.toISOString())
      .lte("date", thisWeek.end.toISOString()),
    db
      .from("transactions")
      .select("category, amount")
      .gte("date", lastWeekStart.toISOString())
      .lte("date", lastWeekEnd.toISOString()),
  ]);

  const thisWeekTxs = (thisWeekRes.data ?? []) as Pick<Transaction, "category" | "amount">[];
  const lastWeekTxs = (lastWeekRes.data ?? []) as Pick<Transaction, "category" | "amount">[];

  const toCategoryMap = (txs: Pick<Transaction, "category" | "amount">[]) => {
    const map: Record<string, number> = {};
    for (const tx of txs) {
      map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
    }
    return map;
  };

  const thisWeekMap = toCategoryMap(thisWeekTxs);
  const lastWeekMap = toCategoryMap(lastWeekTxs);

  const allCategories = new Set([
    ...Object.keys(thisWeekMap),
    ...Object.keys(lastWeekMap),
  ]);

  const chartData = Array.from(allCategories).map((cat) => ({
    category: cat,
    今週: thisWeekMap[cat] ?? 0,
    先週: lastWeekMap[cat] ?? 0,
  }));

  const thisWeekTotal = thisWeekTxs.reduce((s, t) => s + t.amount, 0);
  const lastWeekTotal = lastWeekTxs.reduce((s, t) => s + t.amount, 0);
  const diff = thisWeekTotal - lastWeekTotal;
  const topCategory =
    Object.entries(thisWeekMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

  return NextResponse.json({
    chartData,
    thisWeekTotal,
    lastWeekTotal,
    diff,
    topCategory,
    thisWeekMap,
    lastWeekMap,
  });
}
