import type { createDb } from "@/lib/supabase/db";

type Db = ReturnType<typeof createDb>;

export interface CategoryBudgetOverride {
  id: string;
  category_id: string;
  month: string; // 'YYYY-MM'
  // null = 恒久変更(effective-dated): month 以降ずっと適用される。
  // 値あり = 期間限定: month〜end_month の間だけ適用され、過ぎると自動的に戻る。
  end_month: string | null;
  budget: number;
}

interface CategoryLike {
  id: string;
  budget: number;
}

// Every override with month <= ceilingMonth. Callers resolve any month at or
// before the ceiling from this single fetch instead of querying per month.
// (期間限定の行も month <= ceilingMonth である限りここに含まれる — 期間の
// 終わりが ceiling を超えていても、month 自体が ceiling 以下なら対象になる。)
export async function fetchOverridesUpTo(
  db: Db,
  ceilingMonth: string,
): Promise<CategoryBudgetOverride[]> {
  const { data, error } = await db
    .from("category_budget_overrides")
    .select("id, category_id, month, end_month, budget")
    .lte("month", ceilingMonth)
    .order("month", { ascending: true });
  if (error) throw new Error(`category_budget_overrides fetch: ${error.message}`);
  return (data ?? []) as CategoryBudgetOverride[];
}

// The override in effect for a single category at a given month, or null if
// none applies (caller should fall back to categories.budget in that case).
// Priority: a period override (end_month set) covering the month wins over
// a persistent/effective-dated one — a temporary plan overrides the standing one.
// Within each kind, the most recently *starting* one wins.
export function findEffectiveOverride(
  overrides: CategoryBudgetOverride[],
  month: string,
): CategoryBudgetOverride | null {
  const periodMatches = overrides.filter(
    (o) => o.end_month !== null && o.month <= month && month <= o.end_month,
  );
  if (periodMatches.length > 0) {
    return periodMatches.reduce((a, b) => (b.month > a.month ? b : a));
  }
  const persistentMatches = overrides.filter((o) => o.end_month === null && o.month <= month);
  if (persistentMatches.length > 0) {
    return persistentMatches.reduce((a, b) => (b.month > a.month ? b : a));
  }
  return null;
}

// Effective budget per category for a given month, falling back to
// categories.budget when no override has ever been set for that category.
export function resolveBudgetsForMonth(
  categories: CategoryLike[],
  overrides: CategoryBudgetOverride[],
  month: string,
): Map<string, number> {
  const resolved = new Map(categories.map((c) => [c.id, c.budget]));
  for (const c of categories) {
    const catOverrides = overrides.filter((o) => o.category_id === c.id);
    const winner = findEffectiveOverride(catOverrides, month);
    if (winner) resolved.set(c.id, winner.budget);
  }
  return resolved;
}

export interface CategoryBudgetTrendCategory {
  id: string;
  name: string;
  is_fixed: boolean;
  budget: number;
}

export interface CategoryBudgetTrendPoint {
  month: string;
  totalVnd: number;
  byCategory: CategoryBudgetTrendCategory[];
}

// Resolved "Total Monthly Budget" plus a per-category breakdown for each
// month in `months` (any order/span, e.g. a 6-month window crossing a year
// boundary) — used by the Budget page's trend chart.
export async function computeCategoryBudgetTrend(
  db: Db,
  months: string[],
): Promise<CategoryBudgetTrendPoint[]> {
  const ceilingMonth = months.reduce((a, b) => (b > a ? b : a));
  const [catsRes, overrides] = await Promise.all([
    db.from("categories").select("id, name, budget, is_fixed").order("created_at"),
    fetchOverridesUpTo(db, ceilingMonth),
  ]);
  const categories = (catsRes.data ?? []) as { id: string; name: string; budget: number; is_fixed: boolean }[];

  return months.map((month) => {
    const resolved = resolveBudgetsForMonth(categories, overrides, month);
    const byCategory = categories.map((c) => ({
      id: c.id,
      name: c.name,
      is_fixed: c.is_fixed,
      budget: resolved.get(c.id) ?? c.budget,
    }));
    const totalVnd = byCategory.reduce((s, c) => s + c.budget, 0);
    return { month, totalVnd, byCategory };
  });
}
