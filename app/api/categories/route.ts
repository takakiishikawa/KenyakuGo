import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const db = createDb();
  const { data, error } = await db
    .from("categories")
    .insert({ name: trimmed })
    .select("id, name")
    .single();

  if (error) {
    // unique 制約違反は 409
    if (error.code === "23505") {
      return NextResponse.json({ error: "already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
