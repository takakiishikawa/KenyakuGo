"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Pencil, Trash2, Plus, Check, X, CalendarClock } from "lucide-react";
import { toast } from "@takaki/go-design-system";
import { formatVND, formatJPY } from "@/lib/format";
import { getCategoryColors, getCategoryColorTint } from "@/lib/category-colors";
import { getCategoryIcon } from "@/lib/category-icons";
import { CurrencySwitch, type DisplayCurrency } from "@/components/currency-switch";
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

// カテゴリの月次予算オーバーライド（effective-dated）。
// month 以降、次のオーバーライドが入るまでこの budget がずっと適用される。
interface CategoryOverride {
  id: string;
  category_id: string;
  month: string; // 'YYYY-MM'
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

const VND_PER_JPY = 162;

function makeFormatAmount(displayCurrency: DisplayCurrency) {
  return (vndAmount: number) =>
    displayCurrency === "VND" ? formatVND(vndAmount) : formatJPY(vndAmount / VND_PER_JPY);
}

// Budgets are stored in VND internally, but shown and typed in whichever
// currency the display switch is set to — converting on the way in and out.
function toDisplayAmount(vnd: number, displayCurrency: DisplayCurrency): number {
  return displayCurrency === "VND" ? Math.round(vnd) : Math.round(vnd / VND_PER_JPY);
}

function toVndAmount(displayAmount: number, displayCurrency: DisplayCurrency): number {
  return displayCurrency === "VND" ? displayAmount : Math.round(displayAmount * VND_PER_JPY);
}

function withThousands(v: string, displayCurrency: DisplayCurrency): string {
  const sep = displayCurrency === "VND" ? "." : ",";
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
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
  onSchedule: (categoryId: string, month: string, budget: number) => Promise<void>;
}) {
  const monthOptions = getUpcomingMonths(12);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOptions[1]?.key ?? monthOptions[0].key); // default: next month
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = parseInt(amountInput.replace(/[^0-9]/g, ""), 10);
    const budget = toVndAmount(isNaN(val) ? 0 : val, displayCurrency);
    setSaving(true);
    await onSchedule(cat.id, month, budget);
    setSaving(false);
    setAmountInput("");
    setOpen(false);
  };

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
      <PopoverContent className="w-64 p-3 flex flex-col gap-2.5" align="end">
        <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Schedule a change for {cat.name}
        </p>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-8 text-xs">
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
          Applies from that month onward, until you schedule another change.
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
  onDelete,
  onScheduleOverride,
  onDeleteOverride,
}: {
  cat: Category;
  displayCurrency: DisplayCurrency;
  overrides: CategoryOverride[];
  onUpdate: (id: string, patch: Partial<Pick<Category, "name" | "budget" | "is_fixed">>) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  onScheduleOverride: (categoryId: string, month: string, budget: number) => Promise<void>;
  onDeleteOverride: (categoryId: string, overrideId: string, month: string) => Promise<void>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(cat.name);
  const [budgetInput, setBudgetInput] = useState(String(toDisplayAmount(cat.budget, displayCurrency)));
  const [saving, setSaving] = useState(false);
  const savedBudgetRef = useRef(cat.budget);

  useEffect(() => {
    setBudgetInput(String(toDisplayAmount(cat.budget, displayCurrency)));
    savedBudgetRef.current = cat.budget;
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
    if (budget === savedBudgetRef.current) return;
    savedBudgetRef.current = budget;
    setSaving(true);
    await onUpdate(cat.id, { budget });
    setSaving(false);
  };

  const formatAmount = makeFormatAmount(displayCurrency);
  const currentMonth = monthKeyLocal(new Date());
  const sortedOverrides = [...overrides].sort((a, b) => a.month.localeCompare(b.month));
  // The active override is the most recent one at or before this month —
  // it's already in effect on the Dashboard/Simulation even though the
  // number field above (categories.budget) still shows the pre-override value.
  const activeOverride = [...sortedOverrides].reverse().find((o) => o.month <= currentMonth) ?? null;

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
          <span
            className="text-[13.5px] font-semibold truncate min-w-0 flex-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            {cat.name}
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={withThousands(budgetInput, displayCurrency)}
            onChange={(e) => setBudgetInput(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={saveBudget}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-8 text-[12.5px] text-right w-28 shrink-0 font-num rounded-lg"
            style={{ borderColor: "var(--color-border-default)" }}
            placeholder="0"
          />
          <ScheduleOverridePopover cat={cat} displayCurrency={displayCurrency} onSchedule={onScheduleOverride} />
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 disabled:pointer-events-none disabled:opacity-50 shrink-0"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(cat.id, cat.name)}
            disabled={saving}
            className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 disabled:pointer-events-none disabled:opacity-50 shrink-0"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <Trash2 size={14} />
          </button>
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
                {isActive ? "Since" : "From"} {monthShortLabel(o.month)} · {formatAmount(o.budget)}
                <button
                  type="button"
                  onClick={() => onDeleteOverride(cat.id, o.id, o.month)}
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

function AddCategoryCard({
  isFixed,
  displayCurrency,
  onAdd,
}: {
  isFixed: boolean;
  displayCurrency: DisplayCurrency;
  onAdd: (name: string, budget: number, is_fixed: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const budgetVal = parseInt(budget.replace(/[^0-9]/g, ""), 10);
    setSaving(true);
    await onAdd(trimmed, toVndAmount(isNaN(budgetVal) ? 0 : budgetVal, displayCurrency), isFixed);
    setSaving(false);
    setName("");
    setBudget("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 h-full min-h-[52px] w-full rounded-[10px] border-[1.5px] border-dashed text-sm font-semibold transition-all hover:opacity-80 hover:bg-muted/30 active:scale-[0.98] active:opacity-70"
        style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-subtle)" }}
      >
        <Plus size={15} />
        Add category
      </button>
    );
  }

  return (
    <Card className="p-4 flex flex-col gap-3" style={{ borderColor: "var(--color-border-default)" }}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Category name"
        className="h-7 text-sm"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          value={withThousands(budget, displayCurrency)}
          onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder={`Budget (${displayCurrency})`}
          className="h-7 text-sm text-right flex-1 font-num"
        />
        <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>{displayCurrency}</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim()} className="flex-1">
          Add
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setOpen(false); setName(""); setBudget(""); }}
        >
          ✕
        </Button>
      </div>
    </Card>
  );
}

function SectionGrid({
  title,
  categories,
  totalBudget,
  formatAmount,
  displayCurrency,
  overridesByCategory,
  onUpdate,
  onDelete,
  onAdd,
  onScheduleOverride,
  onDeleteOverride,
}: {
  title: string;
  categories: Category[];
  totalBudget: number;
  formatAmount: (vndAmount: number) => string;
  displayCurrency: DisplayCurrency;
  overridesByCategory: Map<string, CategoryOverride[]>;
  onUpdate: (id: string, patch: Partial<Pick<Category, "name" | "budget" | "is_fixed">>) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  onAdd: (name: string, budget: number, is_fixed: boolean) => Promise<void>;
  onScheduleOverride: (categoryId: string, month: string, budget: number) => Promise<void>;
  onDeleteOverride: (categoryId: string, overrideId: string, month: string) => Promise<void>;
}) {
  const isFixed = title === "Fixed Costs";
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
        className="flex items-center justify-between px-7 py-5 border-b"
        style={{ borderColor: "var(--color-border-default)" }}
      >
        <span className="font-display text-[17px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}{" "}
          <span className="text-[13px] font-normal" style={{ color: "var(--color-text-subtle)" }}>
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </span>
        </span>
        {totalBudget > 0 && (
          <span className="font-num font-bold text-[15px]" style={{ color: "var(--color-text-primary)" }}>
            {formatAmount(totalBudget)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 p-5">
        {sorted.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            displayCurrency={displayCurrency}
            overrides={overridesByCategory.get(cat.id) ?? []}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onScheduleOverride={onScheduleOverride}
            onDeleteOverride={onDeleteOverride}
          />
        ))}
        <AddCategoryCard isFixed={isFixed} displayCurrency={displayCurrency} onAdd={onAdd} />
      </div>
    </Card>
  );
}

export default function BudgetPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [overrides, setOverrides] = useState<CategoryOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("VND");
  const formatAmount = makeFormatAmount(displayCurrency);

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
    async (categoryId: string, month: string, budget: number) => {
      const res = await fetch(`/api/categories/${categoryId}/overrides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, budget }),
      });
      if (!res.ok) {
        toast.error("Failed to schedule the change");
        return;
      }
      const saved = (await res.json()) as Pick<CategoryOverride, "id" | "month" | "budget">;
      setOverrides((prev) => [
        ...prev.filter((o) => !(o.category_id === categoryId && o.month === month)),
        { ...saved, category_id: categoryId },
      ]);
      toast.success(`Scheduled for ${month}`);
    },
    [],
  );

  const handleDeleteOverride = useCallback(
    async (categoryId: string, overrideId: string, month: string) => {
      const res = await fetch(`/api/categories/${categoryId}/overrides?month=${month}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to remove the scheduled change");
        return;
      }
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
    },
    [],
  );

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
          className="mt-8 mb-6 p-7 rounded-2xl"
          style={{
            borderColor: "var(--color-border-default)",
            boxShadow: "0 1px 2px rgba(120,72,10,.04), 0 8px 24px rgba(120,72,10,.05)",
          }}
        >
          <div className="flex items-start justify-between mb-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-text-subtle)" }}>
              Total Monthly Budget
            </p>
            <CurrencySwitch value={displayCurrency} onChange={setDisplayCurrency} />
          </div>
          <p className="font-display text-[44px] font-bold leading-none mb-4" style={{ color: "var(--color-text-primary)" }}>
            {formatAmount(grandTotal)}
          </p>
          <div className="flex gap-7 text-sm">
            <div style={{ color: "var(--color-text-secondary)" }}>
              Variable{" "}
              <b className="font-num font-bold" style={{ color: "var(--color-text-primary)" }}>
                {formatAmount(variableBudgetTotal)}
              </b>
            </div>
            <div style={{ color: "var(--color-text-secondary)" }}>
              Fixed{" "}
              <b className="font-num font-bold" style={{ color: "var(--color-text-primary)" }}>
                {formatAmount(fixedBudgetTotal)}
              </b>
            </div>
          </div>
        </Card>
      )}

      <SectionGrid
        title="Variable Costs"
        categories={variable}
        totalBudget={variableBudgetTotal}
        formatAmount={formatAmount}
        displayCurrency={displayCurrency}
        overridesByCategory={overridesByCategory}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onScheduleOverride={handleScheduleOverride}
        onDeleteOverride={handleDeleteOverride}
      />

      <SectionGrid
        title="Fixed Costs"
        categories={fixed}
        totalBudget={fixedBudgetTotal}
        formatAmount={formatAmount}
        displayCurrency={displayCurrency}
        overridesByCategory={overridesByCategory}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onScheduleOverride={handleScheduleOverride}
        onDeleteOverride={handleDeleteOverride}
      />
    </div>
  );
}
