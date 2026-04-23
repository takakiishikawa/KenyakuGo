import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { type Settings } from "@/lib/supabase/db";

export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const { data } = await db
    .from("settings")
    .select("target_monthly, fixed_costs")
    .eq("id", "singleton")
    .maybeSingle();

  const s = data as Pick<Settings, "target_monthly" | "fixed_costs"> | null;
  return NextResponse.json({
    targetMonthly: s?.target_monthly ?? 0,
    fixedCosts: s?.fixed_costs ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const body = await req.json();
  const targetMonthly =
    typeof body.targetMonthly === "number" ? body.targetMonthly : undefined;
  const fixedCosts =
    typeof body.fixedCosts === "number" ? body.fixedCosts : undefined;

  if (targetMonthly === undefined || fixedCosts === undefined) {
    return NextResponse.json(
      { error: "targetMonthly and fixedCosts are required numbers" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("settings")
    .upsert({
      id: "singleton",
      target_monthly: targetMonthly,
      fixed_costs: fixedCosts,
      updated_at: new Date().toISOString(),
    })
    .select("target_monthly, fixed_costs")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const s = data as Pick<Settings, "target_monthly" | "fixed_costs"> | null;
  return NextResponse.json({
    targetMonthly: s?.target_monthly ?? 0,
    fixedCosts: s?.fixed_costs ?? 0,
  });
}
