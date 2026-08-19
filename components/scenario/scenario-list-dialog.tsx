"use client";

import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@takaki/go-design-system";
import type { Scenario } from "@/lib/scenario/types";
import type { CategoryForCard } from "@/components/category-budget-card";
import { getCategoryIcon } from "@/lib/category-icons";
import { getCategoryHex, getCategoryColorTint } from "@/lib/category-colors";
import { UNDELETABLE_CATEGORIES } from "@/lib/constants";
import { catLabel, t, type Lang } from "@/lib/scenario/dictionary";
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
          <button
            type="button"
            onClick={commit}
            className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70"
            style={{ color: DC.textFaint }}
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setNameInput(scenario.name);
              setEditing(false);
            }}
            className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70"
            style={{ color: DC.textFaint }}
          >
            <X size={13} />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={t(lang, "clickToRename")}
            className="flex-1 text-sm font-semibold truncate min-w-0 text-left cursor-pointer transition-all hover:underline decoration-dotted underline-offset-2 active:opacity-70"
            style={{ color: DC.textPrimary }}
          >
            {scenario.name}
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

// カテゴリマスタの行。ここは「カテゴリそのもの」(名前・固定費/変動費区分)の
// 管理だけが目的で、予算額やスケジュール予約は暮らしタブ側の役割なので置かない。
function CategoryMasterRow({
  cat,
  onRename,
  onDelete,
  lang,
}: {
  cat: CategoryForCard;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  lang: Lang;
}) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(cat.name);
  const Icon = getCategoryIcon(cat.name);
  const canDelete = !(UNDELETABLE_CATEGORIES as readonly string[]).includes(cat.name);

  const commit = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== cat.name) onRename(cat.id, trimmed);
    else setNameInput(cat.name);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b last:border-b-0" style={{ borderColor: DC.trackAlt }}>
      <div
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: getCategoryColorTint(cat.name) }}
      >
        <Icon size={14} style={{ color: getCategoryHex(cat.name) }} />
      </div>
      {editing ? (
        <>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setNameInput(cat.name);
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
              setNameInput(cat.name);
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
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={t(lang, "clickToRename")}
            className="flex-1 text-sm font-semibold truncate min-w-0 text-left cursor-pointer transition-all hover:underline decoration-dotted underline-offset-2 active:opacity-70"
            style={{ color: DC.textPrimary }}
          >
            {catLabel(lang, cat.name)}
          </button>
          <button
            type="button"
            onClick={() => onDelete(cat.id)}
            disabled={!canDelete}
            title={!canDelete ? t(lang, "deleteLastError") : t(lang, "delete")}
            className="p-1 rounded transition-all hover:bg-muted active:scale-90 active:bg-muted/70 disabled:opacity-30 disabled:pointer-events-none"
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
  onCategoryUpdate,
  onCategoryAdd,
  onCategoryDelete,
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
  // ここでは名前・固定費/変動費区分の追加編集削除のみを扱う(予算額・スケジュール
  // 予約は暮らしタブ側の役割なので置かない)。
  categories: CategoryForCard[];
  onCategoryUpdate: (id: string, patch: Partial<Pick<CategoryForCard, "name" | "is_fixed">>) => Promise<void>;
  onCategoryAdd: (name: string, budget: number, isFixed: boolean) => Promise<void>;
  onCategoryDelete: (id: string) => Promise<void>;
  lang: Lang;
}) {
  const [tab, setTab] = useState<ManageTab>("scenarios");
  const [catSub, setCatSub] = useState<"fixed" | "variable">("fixed");
  const [addCatName, setAddCatName] = useState("");

  const fixedCats = categories.filter((c) => c.is_fixed);
  const variableCats = categories.filter((c) => !c.is_fixed);
  const shownCats = catSub === "fixed" ? fixedCats : variableCats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" style={{ backgroundColor: DC.cardBg }}>
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: DC.cardBorder }}>
          <DialogTitle>{t(lang, "manageDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 pt-3 flex flex-col gap-2">
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
          {tab === "categories" && (
            <div className="flex gap-0.5 p-0.5 rounded-lg w-fit" style={{ backgroundColor: DC.track }}>
              {(
                [
                  { k: "fixed" as const, l: t(lang, "fixed") },
                  { k: "variable" as const, l: t(lang, "variable") },
                ]
              ).map((s) => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => setCatSub(s.k)}
                  className="px-3 py-1 rounded-md text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: catSub === s.k ? DC.cardBg : "transparent", color: DC.textPrimary }}
                >
                  {s.l}
                </button>
              ))}
            </div>
          )}
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
          <div className="px-5 py-2 max-h-[60vh] overflow-y-auto">
            {shownCats.map((cat) => (
              <CategoryMasterRow
                key={cat.id}
                cat={cat}
                onRename={(id, name) => onCategoryUpdate(id, { name })}
                onDelete={onCategoryDelete}
                lang={lang}
              />
            ))}
            <div className="flex items-center gap-2 py-2.5">
              <Input
                value={addCatName}
                onChange={(e) => setAddCatName(e.target.value)}
                placeholder={t(lang, "newCategoryName")}
                className="h-8 text-sm flex-1"
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!addCatName.trim()) return;
                  await onCategoryAdd(addCatName.trim(), 0, catSub === "fixed");
                  setAddCatName("");
                }}
              >
                <Plus size={13} />
                {t(lang, "manageAddCategory")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
