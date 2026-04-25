import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";

export interface SubscriptionItem {
  store: string;
  amount: number;
  lastChargedAt: string;
  firstChargedAt: string;
  monthsActive: number;
  chargeCount: number;
  isActive: boolean;
}

const ACTIVE_THRESHOLD_DAYS = 45;

export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { data, error } = await db
    .from("transactions")
    .select("store, amount, date")
    .ilike("category", "%サブスク%")
    .gt("amount", 0)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const txs = (data ?? []) as { store: string; amount: number; date: string }[];

  const grouped: Record<string, { amounts: number[]; dates: string[] }> = {};
  for (const tx of txs) {
    if (!grouped[tx.store]) grouped[tx.store] = { amounts: [], dates: [] };
    grouped[tx.store].amounts.push(tx.amount);
    grouped[tx.store].dates.push(tx.date);
  }

  const now = new Date();

  const subscriptions: SubscriptionItem[] = Object.entries(grouped).map(
    ([store, { amounts, dates }]) => {
      const lastDate = new Date(dates[0]);
      const daysSinceLast =
        (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      const monthSet = new Set(dates.map((d) => d.slice(0, 7)));

      return {
        store,
        amount: amounts[0],
        lastChargedAt: dates[0],
        firstChargedAt: dates[dates.length - 1],
        monthsActive: monthSet.size,
        chargeCount: amounts.length,
        isActive: daysSinceLast <= ACTIVE_THRESHOLD_DAYS,
      };
    }
  );

  subscriptions.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.amount - a.amount;
  });

  return NextResponse.json(subscriptions);
}
