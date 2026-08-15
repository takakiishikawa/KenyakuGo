import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthDb } from "@/lib/supabase/auth-db";

export const maxDuration = 30;

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "month must be 'YYYY-MM'");

const upsertSchema = z.object({
  month: monthSchema,
  budget: z.number().int().min(0),
});

// 指定月のオーバーライドを作成/更新する（同じ月に既にあれば上書き）。
// 「その月から次のオーバーライドが入るまでずっと」この値が適用される。
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { id } = await ctx.params;
  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { month, budget } = parsed.data;

  const { data: cat, error: catError } = await db
    .from("categories")
    .select("id")
    .eq("id", id)
    .single();
  if (catError || !cat) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("category_budget_overrides")
    .upsert(
      { category_id: id, month, budget, updated_at: new Date().toISOString() },
      { onConflict: "category_id,month" },
    )
    .select("id, month, budget")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 指定月のオーバーライドを削除する。それより前の直近のオーバーライド
// （なければ categories.budget）に自動で戻る。
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { id } = await ctx.params;
  const month = req.nextUrl.searchParams.get("month");
  const parsedMonth = monthSchema.safeParse(month);
  if (!parsedMonth.success) {
    return NextResponse.json({ error: "month query param must be 'YYYY-MM'" }, { status: 400 });
  }

  const { error } = await db
    .from("category_budget_overrides")
    .delete()
    .eq("category_id", id)
    .eq("month", parsedMonth.data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
