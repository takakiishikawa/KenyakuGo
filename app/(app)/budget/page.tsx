"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, CalendarClock, Settings2, TrendingUp } from "lucide-react";
import { toast } from "@takaki/go-design-system";
import { getCategoryColors, getCategoryColorTint } from "@/lib/category-colors";
import { getCategoryIcon } from "@/lib/category-icons";
import { CurrencySwitch, type DisplayCurrency } from "@/components/currency-switch";
import { ManageCategoriesDialog } from "@/components/manage-categories-dialog";
import { BudgetTrendDialog } from "@/components/budget-trend-dialog";
import { findEffectiveOverride } from "@/lib/category-budget";
import { makeFormatAmount, toDisplayAmount, toVndAmount, withThousands } from "@/lib/currency";
import {
  Button,
  Card,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@takaki/go-design-system";

interface Category {
  id: string;
  name: string;
  budget: number;
  is_fixed: boolean;
}

// カテゴリの月次予算オーバーライド。
// end_month が null なら「month以降ずっと」(恒久変更)、値があれば
// 「month〜end_month の間だけ」(期間限定)。期間限定は恒久変更より優先される。
interface CategoryOverride {
  id: string;
  category_id: string;
  month: string; // 'YYYY-MM'
  end_month: string | null;
  budget: number;
}

function monthKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthShortLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" });
}

// 今月から count ヶ月ぶんの候補（予算変更の予約先の月を選ぶ用）。
function getUpcomingMonths(count: number): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { key: monthKeyLocal(d), label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) };
  });
}

function overrideLabel(o: CategoryOverride, isActive: boolean): string {
  if (o.end_month === null) {
    return isActive ? `Since ${monthShortLabel(o.month)}` : `From ${monthShortLabel(o.month)}`;
  }
  const range =
    o.end_month === o.month
      ? monthShortLabel(o.month)
      : `${monthShortLabel(o.month)}–${monthShortLabel(o.end_month)}`;
  return isActive ? `Now: ${range}` : range;
}

function CategoryIcon({ name, fixed }: { name: string; fixed?: boolean }) {
  const { text } = getCategoryColors(name);
  const Icon = getCategoryIcon(name);
  return <Icon size={14} style={{ color: fixed ? "#6B5D45" : text }} className="shrink-0" />;
}

function ScheduleOverridePopover({
  cat,
  displayCurrency,
  onSchedule,
}: {
  cat: Category;
  displayCurrency: DisplayCurrency;
  onSchedule: (categoryId: string, month: string, endMonth: string | null, budget: number) => Promise<void>;
}) {
  const monthOptions = getUpcomingMonths(12);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"persistent" | "period">("persistent");
  const [month, setMonth] = useState(monthOptions[1]?.key ?? monthOptions[0].key); // default: next month
  const [endMonth, setEndMonth] = useState(monthOptions[1]?.key ?? monthOptions[0].key);
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (endMonth < month) setEndMonth(month);
  }, [month, endMonth]);

  const handleSave = async () => {
    const val = parseInt(amountInput.replace(/[^0-9]/g, ""), 10);
    const budget = toVndAmount(isNaN(val) ? 0 : val, displayCurrency);
    setSaving(true);
    await onSchedule(cat.id, month, mode === "period" ? endMonth : null, budget);
    setSaving(false);
    setAmountInput("");
    setOpen(false);
  };

  const endMonthOptions = monthOptions.filter((m) => m.key >= month);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Schedule a future change"
          className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 shrink-0"
          style={{ color: "var(--color-text-subtle)" }}
        >
          <CalendarClock size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 flex flex-col gap-2.5" align="end">
        <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Schedule a change for {cat.name}
        </p>

        <div
          className="flex rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          {(
            [
              { key: "persistent", label: "From this month" },
              { key: "period", label: "Just a period" },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className="flex-1 h-7 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: mode === m.key ? "var(--color-primary)" : "transparent",
                color: mode === m.key ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === "period" && (
            <>
              <span className="text-xs shrink-0" style={{ color: "var(--color-text-subtle)" }}>
                to
              </span>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {endMonthOptions.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <Input
          type="text"
          inputMode="numeric"
          value={withThousands(amountInput, displayCurrency)}
          onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder={`New budget (${displayCurrency})`}
          className="h-8 text-xs font-num"
        />
        <p className="text-[11px] leading-snug" style={{ color: "var(--color-text-subtle)" }}>
          {mode === "persistent"
            ? "Applies from that month onward, until you schedule another change."
            : "Applies only for that month/period, then reverts automatically."}
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving || !amountInput}>
          Schedule
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function CategoryCard({
  cat,
  displayCurrency,
  overrides,
  onUpdate,
  onScheduleOverride,
  onDeleteOverride,
}: {
  cat: Category;
  displayCurrency: DisplayCurrency;
  overrides: CategoryOverride[];
  onUpdate: (id: string, patch: Partial<Pick<Category, "name" | "budget" | "is_fixed">>) => Promise<void>;
  onScheduleOverride: (categoryId: string, month: string, endMonth: string | null, budget: number) => Promise<void>;
  onDeleteOverride: (categoryId: string, overrideId: string) => Promise<void>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(cat.name);
  const [budgetInput, setBudgetInput] = useState(String(toDisplayAmount(cat.budget, displayCurrency)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBudgetInput(String(toDisplayAmount(cat.budget, displayCurrency)));
  }, [cat.budget, displayCurrency]);

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === cat.name) {
      setEditingName(false);
      setNameInput(cat.name);
      return;
    }
    setSaving(true);
    await onUpdate(cat.id, { name: trimmed });
    setSaving(false);
    setEditingName(false);
  };

  const saveBudget = async () => {
    const val = parseInt(budgetInput.replace(/[^0-9]/g, ""), 10);
    const budget = toVndAmount(isNaN(val) ? 0 : val, displayCurrency);
    if (budget === cat.budget) return;
    setSaving(true);
    await onUpdate(cat.id, { budget });
    setSaving(false);
  };

  const formatAmount = makeFormatAmount(displayCurrency);
  const currentMonth = monthKeyLocal(new Date());
  const sortedOverrides = [...overrides].sort((a, b) => a.month.localeCompare(b.month));
  // The active override is whichever one actually resolves for this month —
  // it's already in effect on the Dashboard/Simulation even though the
  // number field below (categories.budget) still shows the pre-override value.
  const activeOverride = findEffectiveOverride(overrides, currentMonth);

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border py-3 px-3.5"
      style={{ borderColor: "var(--color-border-default)", backgroundColor: "var(--color-surface-subtle)" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: cat.is_fixed ? "var(--kg-track)" : getCategoryColorTint(cat.name) }}
        >
          <CategoryIcon name={cat.name} fixed={cat.is_fixed} />
        </div>
        {editingName ? (
          <>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setNameInput(cat.name);
                }
              }}
              className="h-7 text-sm flex-1 min-w-0"
              autoFocus
            />
            <button
              type="button"
              onClick={saveName}
              disabled={saving}
              className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 disabled:pointer-events-none disabled:opacity-50 shrink-0"
              style={{ color: "var(--color-text-subtle)" }}
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                setNameInput(cat.name);
              }}
              className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 disabled:pointer-events-none disabled:opacity-50 shrink-0"
              style={{ color: "var(--color-text-subtle)" }}
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditingName(true)}
              title="Click to rename"
              className="text-[13.5px] font-semibold truncate min-w-0 flex-1 text-left cursor-pointer hover:underline decoration-dotted underline-offset-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              {cat.name}
            </button>
            <Input
              type="text"
              inputMode="numeric"
              value={withThousands(budgetInput, displayCurrency)}
              onChange={(e) => setBudgetInput(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={saveBudget}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="h-8 text-[12.5px] text-right w-24 shrink-0 font-num rounded-lg"
              style={{ borderColor: "var(--color-border-default)" }}
              placeholder="0"
            />
            <ScheduleOverridePopover cat={cat} displayCurrency={displayCurrency} onSchedule={onScheduleOverride} />
          </>
        )}
      </div>
      {sortedOverrides.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-10">
          {sortedOverrides.map((o) => {
            const isActive = o.id === activeOverride?.id;
            return (
              <span
                key={o.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: isActive ? "var(--kg-track)" : "var(--color-surface-default)",
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                {overrideLabel(o, isActive)} · {formatAmount(o.budget)}
                <button
                  type="button"
                  onClick={() => onDeleteOverride(cat.id, o.id)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionGrid({
  title,
  categories,
  displayCurrency,
  overridesByCategory,
  onUpdate,
  onManageClick,
  onScheduleOverride,
  onDeleteOverride,
}: {
  title: string;
  categories: Category[];
  displayCurrency: DisplayCurrency;
  overridesByCategory: Map<string, CategoryOverride[]>;
  onUpdate: (id: string, patch: Partial<Pick<Category, "name" | "budget" | "is_fixed">>) => Promise<void>;
  onManageClick: () => void;
  onScheduleOverride: (categoryId: string, month: string, endMonth: string | null, budget: number) => Promise<void>;
  onDeleteOverride: (categoryId: string, overrideId: string) => Promise<void>;
}) {
  const sorted = [...categories].sort((a, b) => b.budget - a.budget);

  return (
    <Card
      className="rounded-2xl overflow-hidden mb-6 p-0"
      style={{
        borderColor: "var(--color-border-default)",
        boxShadow: "0 1px 2px rgba(120,72,10,.04), 0 8px 24px rgba(120,72,10,.05)",
      }}
    >
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "var(--color-border-default)" }}
      >
        <span className="font-display text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}{" "}
          <span className="text-[13px] font-normal" style={{ color: "var(--color-text-subtle)" }}>
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </span>
        </span>
        <button
          type="button"
          onClick={onManageClick}
          title="Manage categories"
          className="flex items-center justify-center h-8 w-8 rounded-lg border transition-all hover:opacity-80 hover:bg-muted active:scale-90 active:bg-muted/70"
          style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
        >
          <Settings2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 p-5">
        {sorted.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            displayCurrency={displayCurrency}
            overrides={overridesByCategory.get(cat.id) ?? []}
            onUpdate={onUpdate}
            onScheduleOverride={onScheduleOverride}
            onDeleteOverride={onDeleteOverride}
          />
        ))}
      </div>
    </Card>
  );
}

const CURRENCY_STORAGE_KEY = "piggybank:displayCurrency";

export default function BudgetPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [overrides, setOverrides] = useState<CategoryOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>("VND");
  const [manageOpen, setManageOpen] = useState<"variable" | "fixed" | null>(null);
  const [trendOpen, setTrendOpen] = useState(false);
  const formatAmount = makeFormatAmount(displayCurrency);

  // 通貨切替は最後に選んだ単位を次回訪問時も引き継ぐ。
  useEffect(() => {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved === "VND" || saved === "JPY") setDisplayCurrencyState(saved);
  }, []);

  const setDisplayCurrency = useCallback((v: DisplayCurrency) => {
    setDisplayCurrencyState(v);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, v);
  }, []);

  const load = useCallback(async () => {
    const [catsRes, overridesRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/categories/overrides"),
    ]);
    if (!catsRes.ok) return;
    setCategories((await catsRes.json()) as Category[]);
    if (overridesRes.ok) setOverrides((await overridesRes.json()) as CategoryOverride[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = useCallback(
    async (id: string, patch: Partial<Pick<Category, "name" | "budget" | "is_fixed">>) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.status === 409) {
        toast.error("That category name already exists");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to update");
        return;
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const handleDelete = useCallback(async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}"? Transactions in this category will be moved to "Other".`,
    );
    if (!confirmed) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success(`Deleted "${name}"`);
  }, []);

  const handleAdd = useCallback(
    async (name: string, budget: number, is_fixed: boolean) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, budget, is_fixed }),
      });
      if (res.status === 409) {
        toast.error("That category already exists");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to add");
        return;
      }
      const newCat = (await res.json()) as Category;
      setCategories((prev) => [...prev, newCat]);
      toast.success(`Added "${name}"`);
    },
    [],
  );

  const handleScheduleOverride = useCallback(
    async (categoryId: string, month: string, endMonth: string | null, budget: number) => {
      const res = await fetch(`/api/categories/${categoryId}/overrides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, end_month: endMonth, budget }),
      });
      if (!res.ok) {
        toast.error("Failed to schedule the change");
        return;
      }
      const saved = (await res.json()) as Pick<CategoryOverride, "id" | "month" | "end_month" | "budget">;
      setOverrides((prev) => [
        ...prev.filter((o) => o.id !== saved.id),
        { ...saved, category_id: categoryId },
      ]);
      toast.success(endMonth ? `Scheduled for ${month}–${endMonth}` : `Scheduled from ${month}`);
    },
    [],
  );

  const handleDeleteOverride = useCallback(async (categoryId: string, overrideId: string) => {
    const res = await fetch(`/api/categories/${categoryId}/overrides/${overrideId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to remove the scheduled change");
      return;
    }
    setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
  }, []);

  const overridesByCategory = new Map<string, CategoryOverride[]>();
  for (const o of overrides) {
    const list = overridesByCategory.get(o.category_id);
    if (list) list.push(o);
    else overridesByCategory.set(o.category_id, [o]);
  }

  const variable = categories.filter((c) => !c.is_fixed);
  const fixed = categories.filter((c) => c.is_fixed);
  const variableBudgetTotal = variable.reduce((s, c) => s + c.budget, 0);
  const fixedBudgetTotal = fixed.reduce((s, c) => s + c.budget, 0);
  const grandTotal = variableBudgetTotal + fixedBudgetTotal;

  if (loading) {
    return (
      <div>
        <div className="mt-8 text-sm text-center py-12" style={{ color: "var(--color-text-secondary)" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      {grandTotal > 0 && (
        <Card
          className="mt-8 mb-5 p-5 rounded-2xl"
          style={{
            borderColor: "var(--color-border-default)",
            boxShadow: "0 1px 2px rgba(120,72,10,.04), 0 8px 24px rgba(120,72,10,.05)",
          }}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: "var(--color-text-subtle)" }}
            >
              Total Monthly Budget
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="rounded-[10px] h-[34px] font-semibold"
                onClick={() => setTrendOpen(true)}
              >
                <TrendingUp size={14} />
                Budget Trend
              </Button>
              <CurrencySwitch value={displayCurrency} onChange={setDisplayCurrency} />
            </div>
          </div>

          <div className="flex items-end gap-8 flex-wrap">
            <span className="font-display text-[32px] font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>
              {formatAmount(grandTotal)}
            </span>
            <div className="flex items-center gap-5 text-[13px] pb-0.5" style={{ color: "var(--color-text-secondary)" }}>
              <div>
                Variable{" "}
                <b className="font-num font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {formatAmount(variableBudgetTotal)}
                </b>
              </div>
              <div>
                Fixed{" "}
                <b className="font-num font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {formatAmount(fixedBudgetTotal)}
                </b>
              </div>
            </div>
          </div>
        </Card>
      )}

      <SectionGrid
        title="Variable Costs"
        categories={variable}
        displayCurrency={displayCurrency}
        overridesByCategory={overridesByCategory}
        onUpdate={handleUpdate}
        onManageClick={() => setManageOpen("variable")}
        onScheduleOverride={handleScheduleOverride}
        onDeleteOverride={handleDeleteOverride}
      />

      <SectionGrid
        title="Fixed Costs"
        categories={fixed}
        displayCurrency={displayCurrency}
        overridesByCategory={overridesByCategory}
        onUpdate={handleUpdate}
        onManageClick={() => setManageOpen("fixed")}
        onScheduleOverride={handleScheduleOverride}
        onDeleteOverride={handleDeleteOverride}
      />

      <ManageCategoriesDialog
        open={manageOpen === "variable"}
        onOpenChange={(o) => setManageOpen(o ? "variable" : null)}
        title="Manage Variable Costs"
        categories={variable}
        isFixed={false}
        displayCurrency={displayCurrency}
        onDelete={handleDelete}
        onAdd={handleAdd}
      />
      <ManageCategoriesDialog
        open={manageOpen === "fixed"}
        onOpenChange={(o) => setManageOpen(o ? "fixed" : null)}
        title="Manage Fixed Costs"
        categories={fixed}
        isFixed={true}
        displayCurrency={displayCurrency}
        onDelete={handleDelete}
        onAdd={handleAdd}
      />
      <BudgetTrendDialog open={trendOpen} onOpenChange={setTrendOpen} displayCurrency={displayCurrency} />
    </div>
  );
}
