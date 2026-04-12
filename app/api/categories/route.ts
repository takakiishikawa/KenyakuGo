import { NextResponse } from "next/server";
import { createDb } from "@/lib/supabase/db";

export async function GET() {
  const db = createDb();
  const { data, error } = await db
    .from("categories")
    .select("id, name")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
