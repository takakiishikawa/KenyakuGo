import { NextResponse } from "next/server";
import { createDbAdmin } from "@/lib/supabase/db";
import { refreshSubscriptions } from "@/lib/subscriptions/refresh";

export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cronSecret || !serviceRoleKey) {
    return NextResponse.json(
      {
        error: "Missing required env",
        missing: {
          CRON_SECRET: !cronSecret,
          SUPABASE_SERVICE_ROLE_KEY: !serviceRoleKey,
        },
      },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createDbAdmin();
  try {
    const rows = await refreshSubscriptions(db);
    const active = rows.filter((r) => r.judgment === "sub" && r.is_active).length;
    const ended = rows.filter((r) => r.judgment === "sub" && !r.is_active).length;
    const review = rows.filter((r) => r.judgment === "unknown").length;
    console.log(
      `[cron/subscriptions] active=${active} ended=${ended} review=${review}`,
    );
    return NextResponse.json({ active, ended, review });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}
