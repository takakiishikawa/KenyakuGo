"use client";

import { useEffect, useState } from "react";
import { Check, X, CalendarClock, Receipt } from "lucide-react";
import { DC } from "@/lib/scenario/design-colors";
import { t, tf, type Lang } from "@/lib/scenario/dictionary";
import type { ScenarioConfig } from "@/lib/scenario/types";
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

// 同棲前の暮らし項目(preFixed/preVariable)向けのカード。同棲後の
// CategoryBudgetCard と見た目・機能(名前変更・期間別オーバーライドの予約・削除)を
// 完全に揃えるための対になるコンポーネント。実カテゴリと違ってDB/VND換算を
// 経由せず、シナリオのJSONB内で完結する(円建てのまま)。

export type LifeItem = ScenarioConfig["cohabitation"]["preFixed"][number];
type LifeItemOverride = LifeItem["overrides"][number];

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

function findEffectiveOverride(overrides: LifeItemOverride[], monthKey: string): LifeItemOverride | null {
  const period = overrides.find((o) => o.endMonth !== null && o.month <= monthKey && monthKey <= (o.endMonth as string));
  if (period) return period;
  const persistent = overrides
    .filter((o) => o.endMonth === null && o.month <= monthKey)
    .sort((a, b) => (a.month < b.month ? 1 : -1))[0];
  return persistent ?? null;
}

function overrideLabel(o: LifeItemOverride, isActive: boolean, lang: Lang): string {
  if (o.endMonth === null) {
    return isActive
      ? tf(lang, "since", { month: monthShortLabel(o.month, lang) })
      : tf(lang, "from", { month: monthShortLabel(o.month, lang) });
  }
  const range =
    o.endMonth === o.month
      ? monthShortLabel(o.month, lang)
      : `${monthShortLabel(o.month, lang)}–${monthShortLabel(o.endMonth, lang)}`;
  return isActive ? `${t(lang, "now")}: ${range}` : range;
}

function formatYenPlain(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

function ScheduleLifeOverridePopover({
  item,
  onSchedule,
  lang,
}: {
  item: LifeItem;
  onSchedule: (itemId: string, month: string, endMonth: string | null, amountYen: number) => void;
  lang: Lang;
}) {
  const monthOptions = getUpcomingMonths(12, lang);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"persistent" | "period">("persistent");
  const [month, setMonth] = useState(monthOptions[1]?.key ?? monthOptions[0].key);
  const [endMonth, setEndMonth] = useState(monthOptions[1]?.key ?? monthOptions[0].key);
  const [amountInput, setAmountInput] = useState("");

  useEffect(() => {
    if (endMonth < month) setEndMonth(month);
  }, [month, endMonth]);

  const handleSave = () => {
    const val = parseInt(amountInput.replace(/[^0-9]/g, ""), 10);
    onSchedule(item.id, month, mode === "period" ? endMonth : null, isNaN(val) ? 0 : val);
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
        <p className="text-sm font-semibold" style={{ color: DC.textPrimary }}>
          {tf(lang, "scheduleChangeFor", { name: item.label })}
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
              className="flex-1 h-7 text-xs font-semibold transition-all"
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
            <SelectTrigger className="h-8 text-sm flex-1">
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
                <SelectTrigger className="h-8 text-sm flex-1">
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
          value={amountInput.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder={t(lang, "newBudgetPlaceholder")}
          className="h-8 text-sm font-num"
        />
        <p className="text-xs leading-snug" style={{ color: DC.textFaint }}>
          {mode === "persistent" ? t(lang, "scheduleHelpPersistent") : t(lang, "scheduleHelpPeriod")}
        </p>
        <Button size="sm" onClick={handleSave} disabled={!amountInput}>
          {t(lang, "scheduleBtn")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function LifeItemCard({
  item,
  onRename,
  onAmountChange,
  onSchedule,
  onDeleteOverride,
  onDelete,
  lang,
}: {
  item: LifeItem;
  onRename: (id: string, label: string) => void;
  onAmountChange: (id: string, monthlyYen: number) => void;
  onSchedule: (itemId: string, month: string, endMonth: string | null, amountYen: number) => void;
  onDeleteOverride: (itemId: string, overrideId: string) => void;
  onDelete: (id: string) => void;
  lang: Lang;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(item.label);
  const [amountText, setAmountText] = useState(String(item.monthlyYen));

  useEffect(() => {
    setAmountText(String(item.monthlyYen));
  }, [item.monthlyYen]);

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === item.label) {
      setEditingName(false);
      setNameInput(item.label);
      return;
    }
    onRename(item.id, trimmed);
    setEditingName(false);
  };

  const saveAmount = () => {
    const digits = amountText.replace(/[^0-9]/g, "");
    const val = digits === "" ? 0 : Number(digits);
    if (val !== item.monthlyYen) onAmountChange(item.id, val);
  };

  const currentMonth = monthKeyLocal(new Date());
  const sortedOverrides = [...item.overrides].sort((a, b) => a.month.localeCompare(b.month));
  const activeOverride = findEffectiveOverride(item.overrides, currentMonth);

  return (
    <div className="flex flex-col gap-2 rounded-xl border py-3 px-3.5" style={{ borderColor: DC.cardBorder, backgroundColor: DC.rowAltBg }}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: DC.track }}>
          <Receipt size={14} style={{ color: DC.textSecondary }} />
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
                  setNameInput(item.label);
                }
              }}
              className="h-7 text-sm flex-1 min-w-0"
              autoFocus
            />
            <button
              type="button"
              onClick={saveName}
              className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 shrink-0"
              style={{ color: DC.textFaint }}
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                setNameInput(item.label);
              }}
              className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 shrink-0"
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
              {item.label}
            </button>
            <Input
              type="text"
              inputMode="numeric"
              value={amountText.replace(/[^0-9]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              onChange={(e) => setAmountText(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={saveAmount}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="h-8 text-[12.5px] text-right w-24 shrink-0 font-num rounded-lg"
              style={{ borderColor: DC.cardBorder }}
              placeholder="0"
            />
            <ScheduleLifeOverridePopover item={item} onSchedule={onSchedule} lang={lang} />
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              title={t(lang, "delete")}
              className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 shrink-0"
              style={{ color: DC.textFaint }}
            >
              <X size={13} />
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
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: isActive ? DC.track : DC.cardBg,
                  color: isActive ? DC.textPrimary : DC.textSecondary,
                  border: `1px solid ${DC.cardBorder}`,
                }}
              >
                {overrideLabel(o, isActive, lang)} · {formatYenPlain(o.amountYen)}
                <button
                  type="button"
                  onClick={() => onDeleteOverride(item.id, o.id)}
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
