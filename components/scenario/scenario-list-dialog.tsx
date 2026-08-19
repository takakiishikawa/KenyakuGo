"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@takaki/go-design-system";
import type { Scenario } from "@/lib/scenario/types";
import type { CategoryBudgetOverride } from "@/lib/category-budget";
import { CategoryBudgetCard, type CategoryForCard } from "@/components/category-budget-card";
import type { DisplayCurrency } from "@/components/currency-switch";
import { toVndAmount, withThousands } from "@/lib/currency";
import { t, type Lang } from "@/lib/scenario/dictionary";
import { DC } from "@/lib/scenario/design-colors";

function ScenarioRow({
  scenario,
  canDelete,
  onSelect,
  onDelete,
  onRename,
  lang,
}: {
  scenario: Scenario;
  canDelete: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  lang: Lang;
}) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(scenario.name);

  const commit = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== scenario.name) onRename(scenario.id, trimmed);
    else setNameInput(scenario.name);
    setEditing(false);
  };

  return (
    <div
      className="flex items-center gap-2 py-2.5 border-b last:border-b-0"
      style={{ borderColor: DC.trackAlt }}
    >
      {editing ? (
        <>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setNameInput(scenario.name);
                setEditing(false);
              }
            }}
            className="h-7 text-sm flex-1 min-w-0"
            autoFocus
          />
          <button type="button" onClick={commit} className="p-1 rounded transition-all hover:bg-muted" style={{ color: DC.textFaint }}>
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setNameInput(scenario.name);
              setEditing(false);
            }}
            className="p-1 rounded transition-all hover:bg-muted"
            style={{ color: DC.textFaint }}
          >
            <X size={13} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-semibold truncate" style={{ color: DC.textPrimary }}>
            {scenario.name}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={t(lang, "rename")}
            className="p-1 rounded transition-all hover:bg-muted"
            style={{ color: DC.textFaint }}
          >
            <Pencil size={12} />
          </button>
          {scenario.is_primary ? (
            <span className="text-[10.5px] font-bold" style={{ color: DC.primary }}>
              {t(lang, "selected")}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(scenario.id)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-all hover:brightness-95"
              style={{ backgroundColor: DC.track, color: DC.textSecondary }}
            >
              {t(lang, "select")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(scenario.id)}
            disabled={!canDelete}
            title={!canDelete ? t(lang, "deleteLastError") : t(lang, "delete")}
            className="p-1 rounded transition-all hover:bg-muted active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
            style={{ color: DC.textFaint }}
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  );
}

type ManageTab = "scenarios" | "categories";

export function ScenarioListDialog({
  open,
  onOpenChange,
  scenarios,
  onSelect,
  onDelete,
  onRename,
  categories,
  overrides,
  onCategoryUpdate,
  onCategoryAdd,
  onCategoryDelete,
  onScheduleOverride,
  onDeleteOverride,
  currency,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: Scenario[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  // カテゴリはシナリオごとではなく全シナリオ共通のマスタデータ(piggybank.categories)
  // なので、この管理ポップアップに「カテゴリ管理」タブとして同居させる
  // (以前はシナリオ設定モーダルの「暮らし」タブの中でしか編集できなかった)。
  categories: CategoryForCard[];
  overrides: CategoryBudgetOverride[];
  onCategoryUpdate: (
    id: string,
    patch: Partial<Pick<CategoryForCard, "name" | "budget" | "is_fixed" | "renewal_cycle_years" | "renewal_fee_months">>,
  ) => Promise<void>;
  onCategoryAdd: (name: string, budget: number, isFixed: boolean) => Promise<void>;
  onCategoryDelete: (id: string) => Promise<void>;
  onScheduleOverride: (categoryId: string, month: string, endMonth: string | null, budget: number) => Promise<void>;
  onDeleteOverride: (categoryId: string, overrideId: string) => Promise<void>;
  currency: DisplayCurrency;
  lang: Lang;
}) {
  const [tab, setTab] = useState<ManageTab>("scenarios");
  const [addCatName, setAddCatName] = useState("");
  const [addCatBudget, setAddCatBudget] = useState("");

  const overridesByCategory = new Map<string, CategoryBudgetOverride[]>();
  for (const o of overrides) {
    const arr = overridesByCategory.get(o.category_id);
    if (arr) arr.push(o);
    else overridesByCategory.set(o.category_id, [o]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ backgroundColor: DC.cardBg }}>
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: DC.cardBorder }}>
          <DialogTitle>{t(lang, "manageDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 pt-3">
          <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: DC.track }}>
            {(
              [
                { k: "scenarios" as const, l: t(lang, "manageScenariosTab") },
                { k: "categories" as const, l: t(lang, "manageCategoriesTab") },
              ]
            ).map((s) => (
              <button
                key={s.k}
                type="button"
                onClick={() => setTab(s.k)}
                className="px-3 py-1 rounded-md text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: tab === s.k ? DC.cardBg : "transparent", color: DC.textPrimary }}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {tab === "scenarios" ? (
          <div className="px-5 py-2 max-h-[60vh] overflow-y-auto">
            {scenarios.map((s) => (
              <ScenarioRow
                key={s.id}
                scenario={s}
                canDelete={scenarios.length > 1}
                onSelect={onSelect}
                onDelete={onDelete}
                onRename={onRename}
                lang={lang}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-3 max-h-[60vh] overflow-y-auto flex flex-col gap-2.5">
            {categories.map((cat) => (
              <CategoryBudgetCard
                key={cat.id}
                cat={cat}
                displayCurrency={currency}
                overrides={overridesByCategory.get(cat.id) ?? []}
                onUpdate={onCategoryUpdate}
                onScheduleOverride={onScheduleOverride}
                onDeleteOverride={onDeleteOverride}
                onDelete={onCategoryDelete}
                lang={lang}
              />
            ))}
            <div className="flex items-center gap-2 rounded-xl border border-dashed py-3 px-3.5" style={{ borderColor: DC.cardBorder }}>
              <Input
                value={addCatName}
                onChange={(e) => setAddCatName(e.target.value)}
                placeholder={t(lang, "newCategoryName")}
                className="h-8 text-sm flex-1"
              />
              <Input
                type="text"
                inputMode="numeric"
                value={withThousands(addCatBudget, currency)}
                onChange={(e) => setAddCatBudget(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="h-8 text-sm w-24 text-right font-num"
              />
              <Button
                size="sm"
                onClick={async () => {
                  const val = parseInt(addCatBudget, 10);
                  if (!addCatName.trim()) return;
                  const budgetVnd = toVndAmount(isNaN(val) ? 0 : val, currency);
                  await onCategoryAdd(addCatName.trim(), budgetVnd, false);
                  setAddCatName("");
                  setAddCatBudget("");
                }}
              >
                <Plus size={13} />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
