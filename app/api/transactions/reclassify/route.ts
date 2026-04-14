import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/supabase/db";

export async function POST(req: NextRequest) {
  // store: 完全一致（既存）/ query: 部分一致テキスト（新規）
  const { store, query, category } = await req.json();
  if ((!store && !query) || !category) {
    return NextResponse.json({ error: "store or query, and category required" }, { status: 400 });
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

  // store: 完全一致 / query: 部分一致（大文字小文字無視）
  const updateQuery = db
    .from("transactions")
    .update({ category, reviewed: true })
    .select("id");

  const { error, data } = store
    ? await updateQuery.eq("store", store)
    : await updateQuery.ilike("store", `%${query}%`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: data?.length ?? 0 });
}
