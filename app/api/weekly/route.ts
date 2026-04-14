import { NextRequest, NextResponse } from "next/server";
import { createDb, type Transaction, type Settings } from "@/lib/supabase/db";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

type PeriodItem = {
  label: string;
  total: number;
  byCategory: Record<string, number>;
};

type BucketDef = { label: string; start: Date; end: Date };

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "week";
  const db = createDb();
  const now = new Date();

  // ── バケット定義（現在日付ベース、全件スキャン不要）──
  const bucketDefs: BucketDef[] = [];

  if (period === "week") {
    // 直近4週（今週 + 過去3週）
    const thisWeekStart = getWeekStart(now);
    for (let i = 3; i >= 0; i--) {
      const ws = new Date(thisWeekStart);
      ws.setDate(ws.getDate() - i * 7);
      const we = getWeekEnd(ws);
      const m = ws.getMonth() + 1;
      const weekNum = Math.ceil(ws.getDate() / 7);
      bucketDefs.push({ label: `${m}月${weekNum}週目`, start: ws, end: we });
    }
  } else if (period === "month") {
    // 直近6ヶ月（今月 + 過去5ヶ月）
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const yr = String(d.getFullYear()).slice(-2);
      const m = d.getMonth() + 1;
      bucketDefs.push({ label: `${yr}年${m}月`, start, end });
    }
  } else {
    // 直近3年（今年 + 過去2年）
    const currentYear = now.getFullYear();
    for (let y = currentYear - 2; y <= currentYear; y++) {
      bucketDefs.push({
        label: `${y}年`,
        start: new Date(y, 0, 1),
        end: new Date(y, 11, 31, 23, 59, 59, 999),
      });
    }
  }

  // ── バケットクエリ + 設定クエリを並列実行 ──
  const [settingsRes, ...results] = await Promise.all([
    db.from("settings").select("target_monthly, fixed_costs").eq("id", "singleton").maybeSingle(),
    ...bucketDefs.map(({ start, end }) =>
      db
        .from("transactions")
        .select("category, amount, date")
        .gt("amount", 0)
        .gte("date", start.toISOString())
        .lte("date", end.toISOString())
        .limit(2000)
    ),
  ]);

  const settings = settingsRes.data as Pick<Settings, "target_monthly" | "fixed_costs"> | null;
  const targetMonthly = settings?.target_monthly ?? 0;
  const fixedCosts = settings?.fixed_costs ?? 0;

  const periods: PeriodItem[] = bucketDefs.map(({ label }, i) => {
    const txs = (results[i].data ?? []) as Pick<Transaction, "category" | "amount" | "date">[];
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const t of txs) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      total += t.amount;
    }
    return { label, total, byCategory };
  });

  // 全カテゴリ集計（合計上位5カテゴリをグラフに表示）
  const categoryTotals: Record<string, number> = {};
  for (const p of periods) {
    for (const [cat, amt] of Object.entries(p.byCategory)) {
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + amt;
    }
  }
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);

  const currentPeriod = periods[periods.length - 1];
  const prevPeriod = periods[periods.length - 2];
  const diff = (currentPeriod?.total ?? 0) - (prevPeriod?.total ?? 0);
  const topCategory =
    Object.entries(currentPeriod?.byCategory ?? {}).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

  // 期間ごとの予測（今のペースが続いた場合の期末予測）
  const currentTotal = currentPeriod?.total ?? 0;
  const prevTotal = prevPeriod?.total ?? 0;
  let projectedTotal: number | null = null;

  if (period === "month" && currentTotal > 0) {
    // 月: 固定費を除いた変動費ペースで推計
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const variableSpend = Math.max(0, currentTotal - fixedCosts);
    projectedTotal = Math.round(fixedCosts + (variableSpend / dayOfMonth) * daysInMonth);
  } else if (period === "week" && currentTotal > 0) {
    // 週: 今日が週の何日目か（月=1 ... 日=7）
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    projectedTotal = Math.round((currentTotal / dayOfWeek) * 7);
  } else if (period === "year" && currentTotal > 0) {
    // 年: 今年の何日目か
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const daysInYear = new Date(now.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365;
    projectedTotal = Math.round((currentTotal / dayOfYear) * daysInYear);
  }

  // 予測ベースの差額（Card2 に使用）
  const projectedDiff = projectedTotal != null ? projectedTotal - prevTotal : null;

  return NextResponse.json({
    periods,
    topCategories,
    diff,
    topCategory,
    currentTotal,
    prevPeriodTotal: prevTotal,
    projectedTotal,
    projectedDiff,
    targetMonthly,
    fixedCosts,
    showYearTab: true,
  });
}
