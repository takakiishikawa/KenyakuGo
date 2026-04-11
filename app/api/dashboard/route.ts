import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const now = new Date();
  const thisWeek = getWeekRange(now);
  const lastWeekStart = new Date(thisWeek.start);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeek.end);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  const thisMonth = getMonthRange(now);

  const [thisWeekTxs, lastWeekTxs, thisMonthTxs, recentTxs, settings] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: thisWeek.start, lte: thisWeek.end } },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: lastWeekStart, lte: lastWeekEnd } },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: thisMonth.start, lte: thisMonth.end } },
      }),
      prisma.transaction.findMany({
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.settings.findUnique({ where: { id: "singleton" } }),
    ]);

  const thisMonthTotal = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);
  const thisWeekTotal = thisWeekTxs.reduce((sum, t) => sum + t.amount, 0);
  const lastWeekTotal = lastWeekTxs.reduce((sum, t) => sum + t.amount, 0);

  const weekDiff =
    lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : 0;

  const targetMonthly = settings?.targetMonthly ?? 0;
  const damBalance = targetMonthly - thisMonthTotal;

  // Category breakdown for this week
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
