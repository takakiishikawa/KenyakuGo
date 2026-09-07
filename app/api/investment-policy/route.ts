import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthDb } from "@/lib/supabase/auth-db";

// 投資方針メモ(口座・戦略・現金・投資対象・コア/サテライト配分・備考)。
// サイドバーのポップアップから参照・編集する単一レコード(1行のみ)。
const SELECT_COLUMNS = "account, strategy, cash, universe, core_note, satellite_note, remarks, updated_at";

const EMPTY_POLICY = {
  account: "",
  strategy: "",
  cash: "",
  universe: "",
  core_note: "",
  satellite_note: "",
  remarks: "",
  updated_at: null,
};

export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { data, error } = await db
    .from("investment_policy")
    .select(SELECT_COLUMNS)
    .eq("id", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? EMPTY_POLICY);
}

const putSchema = z.object({
  account: z.string().trim().max(500),
  strategy: z.string().trim().max(500),
  cash: z.string().trim().max(500),
  universe: z.string().trim().max(500),
  coreNote: z.string().trim().max(500),
  satelliteNote: z.string().trim().max(500),
  remarks: z.string().trim().max(1000),
});

export async function PUT(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { account, strategy, cash, universe, coreNote, satelliteNote, remarks } = parsed.data;

  const { data, error } = await db
    .from("investment_policy")
    .upsert(
      {
        id: true,
        account,
        strategy,
        cash,
        universe,
        core_note: coreNote,
        satellite_note: satelliteNote,
        remarks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
