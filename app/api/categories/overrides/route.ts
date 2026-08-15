import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";

// 全カテゴリぶんの月次予算オーバーライドを一括取得する。
// Budget ページがカテゴリ数ぶん個別リクエストせずに済むようにするためのもの。
export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { data, error } = await db
    .from("category_budget_overrides")
    .select("id, category_id, month, budget")
    .order("month", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
