import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";

export const maxDuration = 30;

export interface SubscriptionHistoryPoint {
  month: string; // 'YYYY-MM'
  label: string; // '2026年5月'
  total: number;
}

const MONTHS_BACK = 12;

// サブスク認定済み店舗（judgment='sub'）について、直近12ヶ月の月毎の利用額を返す
export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const since = new Date();
  since.setMonth(since.getMonth() - (MONTHS_BACK - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data: subs, error: subErr } = await db
    .from("subscriptions")
    .select("store")
    .eq("judgment", "sub");
  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }
  const stores = ((subs ?? []) as { store: string }[]).map((s) => s.store);

  const monthMap = new Map<string, number>();

  if (stores.length > 0) {
    const { data: txs, error: txErr } = await db
      .from("transactions")
      .select("amount, date")
      .gt("amount", 0)
      .gte("date", since.toISOString())
      .in("store", stores)
      .limit(20000);
    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }
    for (const tx of (txs ?? []) as { amount: number; date: string }[]) {
      const key = tx.date.slice(0, 7);
      monthMap.set(key, (monthMap.get(key) ?? 0) + tx.amount);
    }
  }

  const points: SubscriptionHistoryPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < MONTHS_BACK; i++) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, "0")}`;
    points.push({
      month: key,
      label: `${y}年${m}月`,
      total: monthMap.get(key) ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return NextResponse.json(points);
}
