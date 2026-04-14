import { NextResponse } from "next/server";
import { createDb } from "@/lib/supabase/db";

export async function GET() {
  const db = createDb();

  const { data, error } = await db
    .from("transactions")
    .select("store")
    .eq("category", "その他")
    .eq("reviewed", false)
    .gt("amount", 0);

  if (error) return NextResponse.json({ count: 0 });

  const stores = new Set((data ?? []).map((r) => r.store?.trim()).filter(Boolean));
  return NextResponse.json({ count: stores.size });
}
