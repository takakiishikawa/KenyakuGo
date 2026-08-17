"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@takaki/go-design-system";
import type { Scenario } from "@/lib/scenario/types";
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

export function ScenarioListDialog({
  open,
  onOpenChange,
  scenarios,
  onSelect,
  onDelete,
  onRename,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: Scenario[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  lang: Lang;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden" style={{ backgroundColor: DC.cardBg }}>
        <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: DC.cardBorder }}>
          <DialogTitle>{t(lang, "scenarios")}</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
