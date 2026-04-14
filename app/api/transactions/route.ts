import { NextRequest, NextResponse } from "next/server";
import { createDb, type Transaction } from "@/lib/supabase/db";

export const maxDuration = 60; // Vercel タイムアウト延長

// データ開始年月（2024年1月）
const DATA_START_YEAR = 2024;
const DATA_START_MONTH = 0; // 0-indexed

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
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all";
  const category = searchParams.get("category");

  const db = createDb();
  const now = new Date();

  type TxRow = Pick<Transaction, "id" | "store" | "amount" | "category" | "date">;

  const buildQuery = (start?: Date, end?: Date) => {
    let q = db
      .from("transactions")
      .select("id, store, amount, category, date")
      .gt("amount", 0)
      .order("date", { ascending: false })
      .limit(1000);
    if (start) q = q.gte("date", start.toISOString());
    if (end) q = q.lte("date", end.toISOString());
    if (category && category !== "all") q = q.eq("category", category);
    return q;
  };

  // 全期間: 月単位の並列クエリで Supabase 1000行制限を回避
  // allSettled を使い、一部クエリが失敗しても取得できた月のデータは返す
  if (period === "all") {
    const monthBuckets: { start: Date; end: Date }[] = [];
    let curYear = DATA_START_YEAR;
    let curMonth = DATA_START_MONTH;

    while (curYear < now.getFullYear() || (curYear === now.getFullYear() && curMonth <= now.getMonth())) {
      const start = new Date(curYear, curMonth, 1);
      const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59, 999);
      monthBuckets.push({ start, end });
      curMonth++;
      if (curMonth > 11) { curMonth = 0; curYear++; }
    }

    const results = await Promise.allSettled(
      monthBuckets.map(({ start, end }) => buildQuery(start, end))
    );

    const data: TxRow[] = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof buildQuery>>> =>
        r.status === "fulfilled"
      )
      .flatMap((r) => (r.value.data ?? []) as TxRow[])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(data);
  }

  // 週・月は単一クエリで十分
  let range: { start: Date; end: Date } | null = null;
  if (period === "week") range = getWeekRange(now);
  else if (period === "month") range = getMonthRange(now);

  const { data } = await buildQuery(range?.start, range?.end);
  return NextResponse.json((data ?? []) as TxRow[]);
}
