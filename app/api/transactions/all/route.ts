import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";

export async function DELETE() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { error } = await db
    .from("transactions")
    .delete()
    .not("id", "is", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
