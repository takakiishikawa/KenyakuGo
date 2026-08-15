import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthDb } from "@/lib/supabase/auth-db";

export const maxDuration = 30;

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "month must be 'YYYY-MM'");

const upsertSchema = z.object({
  month: monthSchema,
  // null/未指定 = 恒久変更(month以降ずっと)。指定あり = month〜end_month の期間限定。
  end_month: monthSchema.nullable().optional(),
  budget: z.number().int().min(0),
});

// オーバーライドを作成する。
// - 恒久変更(end_month省略/null): 同じカテゴリ・同じ月に既存の恒久変更があれば
//   上書き更新、無ければ新規作成。「その月から次の変更が入るまでずっと」適用。
// - 期間限定(end_month指定): 常に新規作成(同じカテゴリ・同じ月に複数登録可能)。
//   同じ月に恒久変更と重なった場合はこちらが優先される。
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
  const end_month = parsed.data.end_month ?? null;
  if (end_month !== null && end_month < month) {
    return NextResponse.json({ error: "end_month must be on or after month" }, { status: 400 });
  }

  const { data: cat, error: catError } = await db
    .from("categories")
    .select("id")
    .eq("id", id)
    .single();
  if (catError || !cat) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (end_month === null) {
    const { data: existing } = await db
      .from("category_budget_overrides")
      .select("id")
      .eq("category_id", id)
      .eq("month", month)
      .is("end_month", null)
      .maybeSingle();

    if (existing) {
      const { data, error } = await db
        .from("category_budget_overrides")
        .update({ budget, updated_at: new Date().toISOString() })
        .eq("id", (existing as { id: string }).id)
        .select("id, month, end_month, budget")
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }
  }

  const { data, error } = await db
    .from("category_budget_overrides")
    .insert({ category_id: id, month, end_month, budget })
    .select("id, month, end_month, budget")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
