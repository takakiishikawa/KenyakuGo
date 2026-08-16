"use client";

import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@takaki/go-design-system";
import type { Scenario } from "@/lib/scenario/types";
import { t, type Lang } from "@/lib/scenario/dictionary";

export function ScenarioListDialog({
  open,
  onOpenChange,
  scenarios,
  onSelect,
  onDelete,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: Scenario[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  lang: Lang;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border-default)" }}>
          <DialogTitle>{t(lang, "scenarios")}</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-2 max-h-[60vh] overflow-y-auto">
          {scenarios.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <span
                className="flex-1 text-sm font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {s.name}
              </span>
              {s.is_primary ? (
                <span className="text-[10.5px] font-bold" style={{ color: "var(--color-primary)" }}>
                  選択中
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-all hover:brightness-95"
                  style={{ backgroundColor: "var(--kg-track)", color: "var(--color-text-secondary)" }}
                >
                  選択
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                disabled={scenarios.length <= 1}
                title={scenarios.length <= 1 ? "最後の1件は削除できません" : "削除"}
                className="p-1 rounded transition-all hover:bg-muted active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                style={{ color: "var(--color-text-subtle)" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
