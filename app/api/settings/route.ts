import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { getCurrentMonthKey } from "@/lib/budget";

// 当月の予算を扱う。過去月の編集は本エンドポイントでは行わない。
export async function GET() {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const month = getCurrentMonthKey();
  const { data, error } = await db
    .from("monthly_budgets")
    .select("target_monthly, fixed_costs")
    .eq("month", month)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    month,
    targetMonthly: data?.target_monthly ?? 0,
    fixedCosts: data?.fixed_costs ?? 0,
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

  const month = getCurrentMonthKey();

  const { data, error } = await db
    .from("monthly_budgets")
    .upsert({
      month,
      target_monthly: targetMonthly,
      fixed_costs: fixedCosts,
      updated_at: new Date().toISOString(),
    })
    .select("target_monthly, fixed_costs")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    month,
    targetMonthly: data?.target_monthly ?? 0,
    fixedCosts: data?.fixed_costs ?? 0,
  });
}
