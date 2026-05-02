import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthDb } from "@/lib/supabase/auth-db";

export const maxDuration = 30;

const bodySchema = z.object({
  store: z.string().min(1),
  judgment: z.enum(["sub", "not_sub"]),
});

// 要確認タブで「サブスク認定」「除外」を押した結果を user_locked=true で記録。
// 以降は AI 再判定でも上書きされない。
export async function POST(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { store, judgment } = parsed.data;

  const now = new Date().toISOString();
  const { error } = await db
    .from("subscriptions")
    .update({
      judgment,
      user_locked: true,
      // not_sub に倒した場合は実行中タブから即外す
      is_active: judgment === "sub",
      judged_at: now,
      updated_at: now,
    })
    .eq("store", store);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
