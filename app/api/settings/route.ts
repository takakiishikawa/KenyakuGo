import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/supabase/db";

export async function GET() {
  const db = createDb();
  const { data } = await db
    .from("settings")
    .select("target_monthly, fixed_costs")
    .eq("id", "singleton")
    .maybeSingle();

  return NextResponse.json({
    targetMonthly: (data as { target_monthly: number } | null)?.target_monthly ?? 0,
    fixedCosts: (data as { fixed_costs: number } | null)?.fixed_costs ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const { targetMonthly, fixedCosts } = await req.json();
  const db = createDb();

  const { data } = await db
    .from("settings")
    .upsert({
      id: "singleton",
      target_monthly: targetMonthly,
      fixed_costs: fixedCosts,
      updated_at: new Date().toISOString(),
    })
    .select("target_monthly, fixed_costs")
    .single();

  return NextResponse.json({
    targetMonthly: (data as { target_monthly: number } | null)?.target_monthly ?? 0,
    fixedCosts: (data as { fixed_costs: number } | null)?.fixed_costs ?? 0,
  });
}
