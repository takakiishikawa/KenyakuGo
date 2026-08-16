"use client";

import { useEffect, useState } from "react";
import { Check, X, CalendarClock } from "lucide-react";
import { getCategoryColors, getCategoryColorTint } from "@/lib/category-colors";
import { getCategoryIcon } from "@/lib/category-icons";
import { findEffectiveOverride, type CategoryBudgetOverride } from "@/lib/category-budget";
import { makeFormatAmount, toDisplayAmount, toVndAmount, withThousands } from "@/lib/currency";
import { DC } from "@/lib/scenario/design-colors";
import { t, tf, catLabel, type Lang } from "@/lib/scenario/dictionary";
import type { DisplayCurrency } from "@/components/currency-switch";
import {
  Button,
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

// 旧 /budget ページの CategoryCard / ScheduleOverridePopover を移植したもの。
// Simulation設定モーダルの「暮らし」タブ(固定費/変動費)に埋め込んで使う。
// カテゴリの実額(budget)・期間別オーバーライドは piggybank.categories /
// piggybank.category_budget_overrides をそのまま参照する(Dashboardと共有)。

export interface CategoryForCard {
  id: string;
  name: string;
  budget: number;
  is_fixed: boolean;
  renewal_cycle_years: number | null;
  renewal_fee_months: number | null;
}

function monthKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthShortLabel(month: string, lang: Lang): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", { month: "short" });
}

function getUpcomingMonths(count: number, lang: Lang): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return {
      key: monthKeyLocal(d),
      label: d.toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", { month: "short", year: "numeric" }),
    };
  });
}

function overrideLabel(o: CategoryBudgetOverride, isActive: boolean, lang: Lang): string {
  if (o.end_month === null) {
    return isActive
      ? tf(lang, "since", { month: monthShortLabel(o.month, lang) })
      : tf(lang, "from", { month: monthShortLabel(o.month, lang) });
  }
  const range =
    o.end_month === o.month
      ? monthShortLabel(o.month, lang)
      : `${monthShortLabel(o.month, lang)}–${monthShortLabel(o.end_month, lang)}`;
  return isActive ? `${t(lang, "now")}: ${range}` : range;
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
  lang,
}: {
  cat: CategoryForCard;
  displayCurrency: DisplayCurrency;
  onSchedule: (categoryId: string, month: string, endMonth: string | null, budget: number) => Promise<void>;
  lang: Lang;
}) {
  const monthOptions = getUpcomingMonths(12, lang);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"persistent" | "period">("persistent");
  const [month, setMonth] = useState(monthOptions[1]?.key ?? monthOptions[0].key);
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
          title={t(lang, "renewal")}
          className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 shrink-0"
          style={{ color: DC.textFaint }}
        >
          <CalendarClock size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 flex flex-col gap-2.5" align="end">
        <p className="text-xs font-semibold" style={{ color: DC.textPrimary }}>
          {tf(lang, "scheduleChangeFor", { name: catLabel(lang, cat.name) })}
        </p>

        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: DC.cardBorder }}>
          {(
            [
              { key: "persistent" as const, label: t(lang, "fromThisMonth") },
              { key: "period" as const, label: t(lang, "justAPeriod") },
            ]
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className="flex-1 h-7 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: mode === m.key ? DC.primary : "transparent",
                color: mode === m.key ? "#fff" : DC.textSecondary,
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
              <span className="text-xs shrink-0" style={{ color: DC.textFaint }}>
                {t(lang, "to")}
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
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder={`${t(lang, "newBudgetPlaceholder")} (${displayCurrency})`}
          className="h-8 text-xs font-num"
        />
        <p className="text-[11px] leading-snug" style={{ color: DC.textFaint }}>
          {mode === "persistent" ? t(lang, "scheduleHelpPersistent") : t(lang, "scheduleHelpPeriod")}
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving || !amountInput}>
          {t(lang, "scheduleBtn")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function CategoryBudgetCard({
  cat,
  displayCurrency,
  overrides,
  onUpdate,
  onScheduleOverride,
  onDeleteOverride,
  onDelete,
  lang,
}: {
  cat: CategoryForCard;
  displayCurrency: DisplayCurrency;
  overrides: CategoryBudgetOverride[];
  onUpdate: (
    id: string,
    patch: Partial<
      Pick<CategoryForCard, "name" | "budget" | "is_fixed" | "renewal_cycle_years" | "renewal_fee_months">
    >,
  ) => Promise<void>;
  onScheduleOverride: (categoryId: string, month: string, endMonth: string | null, budget: number) => Promise<void>;
  onDeleteOverride: (categoryId: string, overrideId: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  lang: Lang;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(cat.name);
  const [budgetInput, setBudgetInput] = useState(String(toDisplayAmount(cat.budget, displayCurrency)));
  const [renewalCycleInput, setRenewalCycleInput] = useState(String(cat.renewal_cycle_years ?? ""));
  const [renewalFeeInput, setRenewalFeeInput] = useState(String(cat.renewal_fee_months ?? ""));
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

  const saveRenewal = async () => {
    const cycle = parseInt(renewalCycleInput, 10);
    const fee = parseFloat(renewalFeeInput);
    await onUpdate(cat.id, {
      renewal_cycle_years: Number.isFinite(cycle) && cycle > 0 ? cycle : null,
      renewal_fee_months: Number.isFinite(fee) && fee > 0 ? fee : null,
    });
  };

  const formatAmount = makeFormatAmount(displayCurrency);
  const currentMonth = monthKeyLocal(new Date());
  const sortedOverrides = [...overrides].sort((a, b) => a.month.localeCompare(b.month));
  const activeOverride = findEffectiveOverride(overrides, currentMonth);

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border py-3 px-3.5"
      style={{ borderColor: DC.cardBorder, backgroundColor: DC.rowAltBg }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: cat.is_fixed ? DC.track : getCategoryColorTint(cat.name) }}
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
              style={{ color: DC.textFaint }}
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
              style={{ color: DC.textFaint }}
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditingName(true)}
              title={t(lang, "clickToRename")}
              className="text-[13.5px] font-semibold truncate min-w-0 flex-1 text-left cursor-pointer hover:underline decoration-dotted underline-offset-2"
              style={{ color: DC.textPrimary }}
            >
              {catLabel(lang, cat.name)}
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
              style={{ borderColor: DC.cardBorder }}
              placeholder="0"
            />
            <ScheduleOverridePopover cat={cat} displayCurrency={displayCurrency} onSchedule={onScheduleOverride} lang={lang} />
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(cat.id)}
                title={t(lang, "delete")}
                className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 shrink-0"
                style={{ color: DC.textFaint }}
              >
                <X size={13} />
              </button>
            )}
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
                  backgroundColor: isActive ? DC.track : DC.cardBg,
                  color: isActive ? DC.textPrimary : DC.textSecondary,
                  border: `1px solid ${DC.cardBorder}`,
                }}
              >
                {overrideLabel(o, isActive, lang)} · {formatAmount(o.budget)}
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
      {/* 更新料(周期性のある賃貸更新料など)。固定費カテゴリのみ対象。 */}
      {cat.is_fixed && (
        <div className="flex items-center gap-2 pl-10 flex-wrap">
          <span className="text-[11px]" style={{ color: DC.textFaint }}>
            {t(lang, "renewal")}:
          </span>
          <Input
            type="number"
            value={renewalCycleInput}
            onChange={(e) => setRenewalCycleInput(e.target.value)}
            onBlur={saveRenewal}
            className="h-7 text-[11px] w-16 font-num"
          />
          <span className="text-[10.5px]" style={{ color: DC.textFaint }}>
            {t(lang, "renewalCycle")} ·
          </span>
          <Input
            type="number"
            value={renewalFeeInput}
            onChange={(e) => setRenewalFeeInput(e.target.value)}
            onBlur={saveRenewal}
            className="h-7 text-[11px] w-16 font-num"
          />
          <span className="text-[10.5px]" style={{ color: DC.textFaint }}>
            {t(lang, "renewalFee")}
          </span>
        </div>
      )}
    </div>
  );
}
