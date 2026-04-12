import { NextRequest, NextResponse } from "next/server";
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

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "week";
  const db = createDb();
  const now = new Date();

  let currentRange: { start: Date; end: Date };
  let prevRange: { start: Date; end: Date };
  let currentLabel: string;
  let prevLabel: string;

  if (period === "month") {
    currentRange = getMonthRange(now);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevRange = getMonthRange(prevMonth);
    currentLabel = "今月";
    prevLabel = "先月";
  } else {
    currentRange = getWeekRange(now);
    const prevWeekStart = new Date(currentRange.start);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(currentRange.end);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
    prevRange = { start: prevWeekStart, end: prevWeekEnd };
    currentLabel = "今週";
    prevLabel = "先週";
  }

  const [currentRes, prevRes] = await Promise.all([
    db
      .from("transactions")
      .select("category, amount")
      .gte("date", currentRange.start.toISOString())
      .lte("date", currentRange.end.toISOString()),
    db
      .from("transactions")
      .select("category, amount")
      .gte("date", prevRange.start.toISOString())
      .lte("date", prevRange.end.toISOString()),
  ]);

  const currentTxs = (currentRes.data ?? []) as Pick<Transaction, "category" | "amount">[];
  const prevTxs = (prevRes.data ?? []) as Pick<Transaction, "category" | "amount">[];

  const toCategoryMap = (txs: Pick<Transaction, "category" | "amount">[]) => {
    const map: Record<string, number> = {};
    for (const tx of txs) {
      map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
    }
    return map;
  };

  const currentMap = toCategoryMap(currentTxs);
  const prevMap = toCategoryMap(prevTxs);

  const allCategories = new Set([...Object.keys(currentMap), ...Object.keys(prevMap)]);

  const chartData = Array.from(allCategories).map((cat) => ({
    category: cat,
    [currentLabel]: currentMap[cat] ?? 0,
    [prevLabel]: prevMap[cat] ?? 0,
  }));

  const currentTotal = currentTxs.reduce((s, t) => s + t.amount, 0);
  const prevTotal = prevTxs.reduce((s, t) => s + t.amount, 0);
  const diff = currentTotal - prevTotal;
  const topCategory =
    Object.entries(currentMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

  return NextResponse.json({
    chartData,
    currentTotal,
    prevTotal,
    diff,
    topCategory,
    currentMap,
    prevMap,
    currentLabel,
    prevLabel,
  });
}
