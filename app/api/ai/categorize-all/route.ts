import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { categorizeUncategorized } from "@/lib/ai/categorize";

export const maxDuration = 60;

export async function POST() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const out = await categorizeUncategorized(db);
  if (out.error) {
    return NextResponse.json({ error: out.error }, { status: 500 });
  }
  return NextResponse.json({ updated: out.updated, total: out.total });
}
