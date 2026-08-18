import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthDb } from "@/lib/supabase/auth-db";

// 実際に投資した金額の記録。ダッシュボードの「投資を記録」ボタンから登録し、
// Simulationの月次表示で「経過済みの月は実際の投資額」を出すのに使う。
export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { data, error } = await db
    .from("investment_entries")
    .select("id, amount_vnd, invested_on, note, created_at")
    .order("invested_on", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

const postSchema = z.object({
  amountVnd: z.number().int().min(1),
  investedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { amountVnd, investedOn, note } = parsed.data;

  const { data, error } = await db
    .from("investment_entries")
    .insert({ amount_vnd: amountVnd, invested_on: investedOn, note: note || null })
    .select("id, amount_vnd, invested_on, note, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
