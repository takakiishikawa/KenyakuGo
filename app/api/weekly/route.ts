import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/supabase/auth-db";
import { type Transaction } from "@/lib/supabase/db";

type PeriodItem = {
  label: string;
  total: number;
  byCategory: Record<string, number>;
  start: string;
  end: string;
  // 当月分は月の途中までの実績しか無いため、線形予測(残り日数ぶん実績を
  // 引き伸ばした見込み額)に差し替えたバケットである場合にtrue。
  isForecast?: boolean;
};

type BucketDef = { label: string; start: Date; end: Date };
type CategoryType = "variable" | "fixed" | "all";

export async function GET(req: NextRequest) {
  const result = await getAuthDb();
  if (result instanceof NextResponse) return result;
  const { db } = result;

  const typeParam = req.nextUrl.searchParams.get("type") ?? "variable";
  const categoryType: CategoryType =
    typeParam === "fixed" ? "fixed" : typeParam === "all" ? "all" : "variable";
  // Special expenses (one-off items flagged from Transactions) are excluded
  // from the Report by default, same as the Dashboard — toggle to include them.
  const includeSpecial = req.nextUrl.searchParams.get("includeSpecial") === "true";

  const now = new Date();

  // 過去9ヶ月分の月次バケットを生成
  const bucketDefs: BucketDef[] = [];
  for (let i = 8; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const yr = String(d.getFullYear()).slice(-2);
    const m = d.getMonth() + 1;
    bucketDefs.push({ label: `${yr}年${m}月`, start, end });
  }

  const [categoryRows, ...results] = await Promise.all([
    db.from("categories").select("name, is_fixed, budget").order("created_at"),
    ...bucketDefs.map(({ start, end }) => {
      let q = db
        .from("transactions")
        .select("category, amount, date")
        .gt("amount", 0)
        .gte("date", start.toISOString())
        .lte("date", end.toISOString())
        .limit(2000);
      if (!includeSpecial) q = q.eq("excluded_from_dashboard", false);
      return q;
    }),
  ]);

  const allCategories = (categoryRows.data ?? []) as { name: string; is_fixed: boolean; budget: number }[];
  const fixedSet = new Set(allCategories.filter((c) => c.is_fixed).map((c) => c.name));

  function matchesType(category: string): boolean {
    if (categoryType === "all") return true;
    if (categoryType === "fixed") return fixedSet.has(category);
    return !fixedSet.has(category);
  }

  const periods: PeriodItem[] = bucketDefs.map(({ label, start, end }, i) => {
    const txs = (results[i].data ?? []) as Pick<
      Transaction,
      "category" | "amount" | "date"
    >[];
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const t of txs) {
      if (!matchesType(t.category)) continue;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      total += t.amount;
    }
    return {
      label,
      total,
      byCategory,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });

  const categoryTotals: Record<string, number> = {};
  for (const p of periods) {
    for (const [cat, amt] of Object.entries(p.byCategory)) {
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + amt;
    }
  }

  // チップ表示用カテゴリ一覧（支出額の多い順）
  const managedNames = allCategories
    .filter((c) => matchesType(c.name))
    .map((c) => c.name);
  const categoryOrder = new Map<string, number>();
  managedNames.forEach((c, i) => categoryOrder.set(c, i));

  const allCategoryNames = new Set<string>([
    ...managedNames,
    ...Object.keys(categoryTotals),
  ]);
  const topCategories = [...allCategoryNames].sort((a, b) => {
    const sa = categoryTotals[a] ?? 0;
    const sb = categoryTotals[b] ?? 0;
    if (sb !== sa) return sb - sa;
    const oa = categoryOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const ob = categoryOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
    return oa - ob;
  });

  // カテゴリ名 → 固定費かどうか。Report の "All" タブで固定費/変動費を
  // グループ表示するために使う。
  const categoryFixed: Record<string, boolean> = {};
  for (const name of allCategoryNames) categoryFixed[name] = fixedSet.has(name);

  // 当月(最後のバケット)は月の途中までしか実績が無く、他の月とそのまま
  // 比べると必ず少なく見えてしまう。残り日数ぶんを線形に引き伸ばした
  // 着地見込みへ差し替え、ラベルに「(予測)」を付ける。
  // - 変動費: 実績 ÷ 経過日数 × 月の日数
  // - 固定費: 実績があればそれをそのまま(既に払い済み)、無ければ予算額を見込みとする
  const lastIdx = periods.length - 1;
  const lastBucket = bucketDefs[lastIdx];
  const daysInMonth = lastBucket.end.getDate();
  const dayOfMonth = Math.min(now.getDate(), daysInMonth);
  if (lastIdx >= 0 && dayOfMonth > 0 && dayOfMonth < daysInMonth) {
    const actual = periods[lastIdx];
    const forecastByCategory: Record<string, number> = {};
    let forecastTotal = 0;
    const known = new Set(allCategories.map((c) => c.name));
    for (const c of allCategories) {
      if (!matchesType(c.name)) continue;
      const spentSoFar = actual.byCategory[c.name] ?? 0;
      const forecast = c.is_fixed
        ? (spentSoFar > 0 ? spentSoFar : c.budget)
        : (spentSoFar > 0 ? Math.round((spentSoFar / dayOfMonth) * daysInMonth) : 0);
      if (forecast > 0) forecastByCategory[c.name] = forecast;
      forecastTotal += forecast;
    }
    // カテゴリ管理から外れた(リネーム/削除済みの)名前で実績が付いている分は
    // 見込みを立てようが無いので実績のまま素通しする。
    for (const [cat, amt] of Object.entries(actual.byCategory)) {
      if (!known.has(cat)) {
        forecastByCategory[cat] = amt;
        forecastTotal += amt;
      }
    }
    periods[lastIdx] = {
      ...actual,
      label: `${actual.label}（予測）`,
      total: forecastTotal,
      byCategory: forecastByCategory,
      isForecast: true,
    };
  }

  return NextResponse.json({
    periods,
    topCategories,
    categoryFixed,
    categoryType,
    includeSpecial,
  });
}
