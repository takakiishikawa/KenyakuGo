import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";

// 指定オーバーライドを削除する。削除後は、それより前の直近のオーバーライド
// （無ければ categories.budget）に自動で戻る。
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; overrideId: string }> },
) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { id, overrideId } = await ctx.params;

  const { error } = await db
    .from("category_budget_overrides")
    .delete()
    .eq("id", overrideId)
    .eq("category_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
