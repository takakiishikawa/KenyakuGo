import { NextResponse } from "next/server";
import { createDb, type Transaction, type Settings } from "@/lib/supabase/db";

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET() {
  const db = createDb();
  const now = new Date();
  const thisMonth = getMonthRange(now);

  const [thisMonthRes, allRes, settingsRes] = await Promise.all([
    db
      .from("transactions")
      .select("amount")
      .gte("date", thisMonth.start.toISOString())
      .lte("date", thisMonth.end.toISOString()),
    db.from("transactions").select("amount, date"),
    db.from("settings").select("target_monthly").eq("id", "singleton").maybeSingle(),
  ]);

  const thisMonthTxs = (thisMonthRes.data ?? []) as Pick<Transaction, "amount">[];
  const allTxs = (allRes.data ?? []) as Pick<Transaction, "amount" | "date">[];
  const settings = settingsRes.data as Pick<Settings, "target_monthly"> | null;

  const targetMonthly = settings?.target_monthly ?? 0;
  const thisMonthTotal = thisMonthTxs.reduce((s, t) => s + t.amount, 0);
  const currentBalance = targetMonthly - thisMonthTotal;

  const monthlyMap: Record<string, number> = {};
  for (const tx of allTxs) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyMap[key] = (monthlyMap[key] ?? 0) + tx.amount;
  }

  let cumulativeBalance = 0;
  for (const monthSpend of Object.values(monthlyMap)) {
    cumulativeBalance += targetMonthly - monthSpend;
  }

  const achievementRate =
    targetMonthly > 0
      ? Math.min(Math.round((currentBalance / targetMonthly) * 100), 100)
      : 0;

  return NextResponse.json({
    targetMonthly,
    thisMonthTotal,
    currentBalance,
    achievementRate,
    cumulativeBalance,
  });
}
