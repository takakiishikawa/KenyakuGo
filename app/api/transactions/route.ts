import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all";
  const category = searchParams.get("category");

  const now = new Date();
  let dateFilter = {};

  if (period === "week") {
    const range = getWeekRange(now);
    dateFilter = { date: { gte: range.start, lte: range.end } };
  } else if (period === "month") {
    const range = getMonthRange(now);
    dateFilter = { date: { gte: range.start, lte: range.end } };
  }

  const where = {
    ...dateFilter,
    ...(category && category !== "all" ? { category } : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}
