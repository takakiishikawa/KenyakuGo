import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { scenarioConfigSchema, normalizeScenarioConfig } from "@/lib/scenario/types";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { id } = await ctx.params;
  const body = await req.json();

  // シナリオの切り替え(単体表示・設定モーダルの初期選択対象を変える)。
  if (body.isPrimary === true) {
    const { error: clearError } = await db
      .from("scenarios")
      .update({ is_primary: false })
      .neq("id", id);
    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }
    const { data, error } = await db
      .from("scenarios")
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, is_primary, config, created_at, updated_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ...data, config: normalizeScenarioConfig(data.config) });
  }

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed || trimmed.length > 50) {
      return NextResponse.json({ error: "name must be 1–50 characters" }, { status: 400 });
    }
    updatePayload.name = trimmed;
  }

  if (body.config !== undefined) {
    const parsed = scenarioConfigSchema.safeParse(body.config);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid config" }, { status: 400 });
    }
    updatePayload.config = parsed.data;
  }

  const { data, error } = await db
    .from("scenarios")
    .update(updatePayload)
    .eq("id", id)
    .select("id, name, is_primary, config, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, config: normalizeScenarioConfig(data.config) });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { id } = await ctx.params;

  const { count } = await db.from("scenarios").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "最後の1件は削除できません" }, { status: 400 });
  }

  const { data: cur } = await db.from("scenarios").select("is_primary").eq("id", id).single();

  const { error } = await db.from("scenarios").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 選択中(primary)のシナリオを消した場合、残っている先頭の1件を選択状態にする。
  if ((cur as { is_primary?: boolean } | null)?.is_primary) {
    const { data: next } = await db
      .from("scenarios")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await db.from("scenarios").update({ is_primary: true }).eq("id", (next as { id: string }).id);
    }
  }

  return NextResponse.json({ ok: true });
}
