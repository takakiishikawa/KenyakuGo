import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { computeCategoryBudgetTrend } from "@/lib/category-budget";
import { monthKey } from "@/lib/budget";

export const maxDuration = 30;

// 今月から count ヶ月ぶんの Total Monthly Budget 推移(カテゴリ内訳つき)。
// Budgetページの「Budget Trend」チャート用。
export async function GET(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const countParam = req.nextUrl.searchParams.get("months");
  const count = Math.min(24, Math.max(1, parseInt(countParam ?? "6", 10) || 6));

  const now = new Date();
  const months = Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return monthKey(d.getFullYear(), d.getMonth());
  });

  const trend = await computeCategoryBudgetTrend(db, months);
  return NextResponse.json({ months: trend });
}
