import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET() {
  const now = new Date();
  const thisMonth = getMonthRange(now);

  const [thisMonthTxs, allTxs, settings] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: thisMonth.start, lte: thisMonth.end } },
    }),
    prisma.transaction.findMany(),
    prisma.settings.findUnique({ where: { id: "singleton" } }),
  ]);

  const targetMonthly = settings?.targetMonthly ?? 0;
  const thisMonthTotal = thisMonthTxs.reduce((s, t) => s + t.amount, 0);
  const currentBalance = targetMonthly - thisMonthTotal;

  // Cumulative: group all transactions by month
  const monthlyMap: Record<string, number> = {};
  for (const tx of allTxs) {
    const key = `${tx.date.getFullYear()}-${tx.date.getMonth()}`;
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
