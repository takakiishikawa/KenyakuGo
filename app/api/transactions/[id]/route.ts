import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/supabase/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { category } = await req.json();
  const db = createDb();

  const { data } = await db
    .from("transactions")
    .update({ category, reviewed: true })
    .eq("id", id)
    .select("id, store, amount, category, date")
    .single();

  return NextResponse.json(data);
}
