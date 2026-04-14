import { NextRequest, NextResponse } from "next/server";
import { createDb, type Transaction } from "@/lib/supabase/db";

// Supabase max-rows はサーバー側で 1000 行に制限されるため、
// 全期間クエリは月単位の並列クエリに分割して全件取得する
const DATA_START = new Date(2024, 0, 1); // データ開始月 (2024年1月)

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

  // 全期間: 月単位の並列クエリで Supabase の 1000 行制限を回避
  if (period === "all") {
    const monthBuckets: { start: Date; end: Date }[] = [];
    let cur = new Date(DATA_START);
    while (cur <= now) {
      const start = new Date(cur.getFullYear(), cur.getMonth(), 1);
      const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
      monthBuckets.push({ start, end });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    const results = await Promise.all(
      monthBuckets.map(({ start, end }) => buildQuery(start, end))
    );

    const data: TxRow[] = results
      .flatMap((r) => (r.data ?? []) as TxRow[])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(data);
  }

  // 週・月フィルタ: 期間が短いので単一クエリで十分
  let range: { start: Date; end: Date } | null = null;
  if (period === "week") range = getWeekRange(now);
  else if (period === "month") range = getMonthRange(now);

  const { data } = await buildQuery(range?.start, range?.end);
  return NextResponse.json((data ?? []) as TxRow[]);
}
