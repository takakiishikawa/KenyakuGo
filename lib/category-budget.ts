import { createDb } from "@/lib/supabase/db";

type Db = ReturnType<typeof createDb>;

export interface CategoryBudgetOverride {
  category_id: string;
  month: string; // 'YYYY-MM'
  budget: number;
}

interface CategoryLike {
  id: string;
  budget: number;
}

// Every override with month <= ceilingMonth. Callers resolve any month at or
// before the ceiling from this single fetch instead of querying per month.
export async function fetchOverridesUpTo(
  db: Db,
  ceilingMonth: string,
): Promise<CategoryBudgetOverride[]> {
  const { data, error } = await db
    .from("category_budget_overrides")
    .select("category_id, month, budget")
    .lte("month", ceilingMonth)
    .order("month", { ascending: true });
  if (error) throw new Error(`category_budget_overrides fetch: ${error.message}`);
  return (data ?? []) as CategoryBudgetOverride[];
}

// Effective budget per category for a given month: the most recent override
// at or before that month, falling back to categories.budget if no override
// has ever been set yet for that category. Overrides are effective-dated —
// once set for a month they carry forward until a later override replaces
// them — so a single permanent change (e.g. lower rent from September) and a
// temporary one (e.g. low groceries in September, back to normal in October)
// use the same mechanism.
export function resolveBudgetsForMonth(
  categories: CategoryLike[],
  overrides: CategoryBudgetOverride[],
  month: string,
): Map<string, number> {
  const resolved = new Map(categories.map((c) => [c.id, c.budget]));
  for (const c of categories) {
    let latest: CategoryBudgetOverride | null = null;
    for (const o of overrides) {
      if (o.category_id !== c.id || o.month > month) continue;
      if (!latest || o.month > latest.month) latest = o;
    }
    if (latest) resolved.set(c.id, latest.budget);
  }
  return resolved;
}
