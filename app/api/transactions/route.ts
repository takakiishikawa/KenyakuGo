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
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all";
  const category = searchParams.get("category");

  const db = createDb();
  let query = db
    .from("transactions")
    .select("id, store, amount, category, date")
    .order("date", { ascending: false });

  const now = new Date();
  if (period === "week") {
    const range = getWeekRange(now);
    query = query.gte("date", range.start.toISOString()).lte("date", range.end.toISOString());
  } else if (period === "month") {
    const range = getMonthRange(now);
    query = query.gte("date", range.start.toISOString()).lte("date", range.end.toISOString());
  }

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return NextResponse.json(
    (data ?? []) as Pick<Transaction, "id" | "store" | "amount" | "category" | "date">[]
  );
}
