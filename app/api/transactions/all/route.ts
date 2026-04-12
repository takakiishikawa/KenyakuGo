import { NextResponse } from "next/server";
import { createDb } from "@/lib/supabase/db";

export async function DELETE() {
  const db = createDb();
  // Supabase requires a filter — .not("id","is",null) matches all rows
  await db.from("transactions").delete().not("id", "is", null);
  return NextResponse.json({ ok: true });
}
