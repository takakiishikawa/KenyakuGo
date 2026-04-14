import { NextRequest, NextResponse } from "next/server";
import { createDb, type Transaction } from "@/lib/supabase/db";

export const maxDuration = 60; // Vercel タイムアウト延長

// データ開始日（実際の最古レコードより少し前に設定）
const DATA_START = new Date(2024, 2, 1); // 2024-03-01

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

  // 全期間: 週単位の並列クエリで Supabase 1000行制限を回避
  // 月単位では1ヶ月に1000件超の場合に切れるため、週単位（7日）に分割
  // allSettled を使い、一部クエリが失敗しても取得できた週のデータは返す
  if (period === "all") {
    const weekBuckets: { start: Date; end: Date }[] = [];
    const cursor = new Date(DATA_START);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= now) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      weekBuckets.push({ start, end: end > now ? now : end });
      cursor.setDate(cursor.getDate() + 7);
    }

    const results = await Promise.allSettled(
      weekBuckets.map(({ start, end }) => buildQuery(start, end))
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
