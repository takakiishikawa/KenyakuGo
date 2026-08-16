import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { getJpyToVndRate } from "@/lib/exchange-rate";
import { scenarioConfigSchema, DEFAULT_SCENARIO_CONFIG } from "@/lib/scenario/types";

// シナリオ一覧 + 為替レート(暮らしのVND予算をJPYへ換算するため)を1回で返す。
// 「暮らし」の実額自体は /api/categories, /api/categories/overrides を別途叩く
// (Budgetページと同じ既存エンドポイントをそのまま流用)。
export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const [scenariosRes, vndPerJpy] = await Promise.all([
    db
      .from("scenarios")
      .select("id, name, is_primary, config, created_at, updated_at")
      .order("created_at", { ascending: true }),
    getJpyToVndRate(),
  ]);

  if (scenariosRes.error) {
    return NextResponse.json({ error: scenariosRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ scenarios: scenariosRes.data ?? [], vndPerJpy });
}

export async function POST(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 50) {
    return NextResponse.json({ error: "name must be 1–50 characters" }, { status: 400 });
  }
  const configParsed = scenarioConfigSchema.safeParse(body.config ?? DEFAULT_SCENARIO_CONFIG);
  if (!configParsed.success) {
    return NextResponse.json({ error: "invalid config" }, { status: 400 });
  }

  const { data, error } = await db
    .from("scenarios")
    .insert({ name, config: configParsed.data, is_primary: false })
    .select("id, name, is_primary, config, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
