"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@takaki/go-design-system";
import type { DisplayCurrency } from "@/components/currency-switch";
import { makeFormatAmount, toVndAmount, withThousands } from "@/lib/currency";

interface Category {
  id: string;
  name: string;
  budget: number;
  is_fixed: boolean;
}

// カテゴリの追加・削除をまとめて行うダイアログ。
// 名前変更・予算額の編集はBudgetページの各カードで直接行う(このダイアログは
// 追加/削除に専念する)。
export function ManageCategoriesDialog({
  open,
  onOpenChange,
  title,
  categories,
  isFixed,
  displayCurrency,
  onDelete,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  categories: Category[];
  isFixed: boolean;
  displayCurrency: DisplayCurrency;
  onDelete: (id: string, name: string) => Promise<void>;
  onAdd: (name: string, budget: number, is_fixed: boolean) => Promise<void>;
}) {
  const formatAmount = makeFormatAmount(displayCurrency);
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
  };

  const sorted = [...categories].sort((a, b) => b.budget - a.budget);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col max-h-[80vh]">
        <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: "var(--color-border-default)" }}>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--color-text-secondary)" }}>
              No categories yet.
            </p>
          ) : (
            sorted.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                style={{ borderColor: "var(--color-border-default)" }}
              >
                <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  {cat.name}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-num text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {formatAmount(cat.budget)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(cat.id, cat.name)}
                    className="p-1 rounded transition-all hover:bg-muted active:scale-90"
                    style={{ color: "var(--color-text-subtle)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center gap-2" style={{ borderColor: "var(--color-border-default)" }}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="New category name"
            className="h-9 text-sm flex-1"
          />
          <Input
            type="text"
            inputMode="numeric"
            value={withThousands(budget, displayCurrency)}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder={displayCurrency}
            className="h-9 text-sm text-right w-28 font-num"
          />
          <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim()}>
            <Plus size={14} />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
