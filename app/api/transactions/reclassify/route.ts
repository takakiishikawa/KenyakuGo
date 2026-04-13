import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/supabase/db";

export async function POST(req: NextRequest) {
  const { store, category } = await req.json();
  if (!store || !category) {
    return NextResponse.json({ error: "store and category required" }, { status: 400 });
  }

  const db = createDb();

  // カテゴリが存在しなければ追加
  const { data: existing } = await db
    .from("categories")
    .select("name")
    .eq("name", category)
    .maybeSingle();

  if (!existing) {
    await db.from("categories").insert({ name: category });
  }

  // 同じ店名の全取引を一括更新（reviewed = true でレビュー済みとしてマーク）
  const { error, data } = await db
    .from("transactions")
    .update({ category, reviewed: true })
    .eq("store", store)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: data?.length ?? 0 });
}
