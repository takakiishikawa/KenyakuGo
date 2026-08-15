"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AlertTriangle, Plus, Trash2, StickyNote, TrendingUp, TrendingDown } from "lucide-react";
import { formatJPY, formatVND } from "@/lib/format";
import type { SimulationMonth, SpecialEntry } from "@/lib/simulation";
import { NoteTag } from "@/components/note-tag";
import { CurrencySwitch, type DisplayCurrency } from "@/components/currency-switch";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Tag,
  toast,
} from "@takaki/go-design-system";

interface SimulationData {
  year: number;
  vndPerJpy: number;
  months: SimulationMonth[];
  annualIncome: number;
  annualExpense: number;
  annualSpecialExpense: number;
  annualRemaining: number;
  yearEndProjection: number;
}

const CARD_SHADOW = "0 1px 2px rgba(120,72,10,.04), 0 8px 24px rgba(120,72,10,.05)";
// 固定幅の列にして、内容に対して余白が広がりすぎないようにする(fr指定だと
// カード幅いっぱいに間延びしてしまうため)。列数が少ない分、最後の列の右に
// 余白が残るのは許容。
const GRID_COLS = "108px 104px 108px 96px 108px 104px 116px";
const GRID_GAP = 22;

function digitsOnly(v: string): string {
  return v.replace(/[^0-9-]/g, "");
}

function withCommas(v: string): string {
  const neg = v.startsWith("-");
  const digits = v.replace(/-/g, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return neg ? `-${grouped}` : grouped;
}

// Every amount in this page is stored/computed in JPY — this renders it in
// whichever currency the switch is set to, converting with the day's rate.
function makeFormatAmount(displayCurrency: DisplayCurrency, vndPerJpy: number) {
  return (jpyAmount: number) =>
    displayCurrency === "JPY" ? formatJPY(jpyAmount) : formatVND(jpyAmount * vndPerJpy);
}

function formatNoteTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Income is stored/edited in JPY internally, but shown and typed in
// whichever currency the display switch is set to — converting on the way
// in and out — so it stays consistent with every other figure on the page.
// Starts as plain text; a click turns it into an editable field.
function IncomeInput({
  value,
  displayCurrency,
  vndPerJpy,
  formatAmount,
  onSave,
}: {
  value: number;
  displayCurrency: DisplayCurrency;
  vndPerJpy: number;
  formatAmount: (jpyAmount: number) => string;
  onSave: (jpyAmount: number) => void;
}) {
  const toDisplay = (jpy: number) =>
    displayCurrency === "JPY" ? Math.round(jpy) : Math.round(jpy * vndPerJpy);
  const toJpy = (displayAmount: number) =>
    displayCurrency === "JPY" ? displayAmount : displayAmount / vndPerJpy;

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(toDisplay(value)));
  const savedValueRef = useRef(value);

  useEffect(() => {
    setText(String(toDisplay(value)));
    savedValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, displayCurrency, vndPerJpy]);

  const commit = () => {
    const displayAmount = parseInt(digitsOnly(text), 10) || 0;
    const n = Math.round(toJpy(displayAmount));
    if (n !== savedValueRef.current) {
      savedValueRef.current = n;
      onSave(n);
    }
    setText(String(toDisplay(n)));
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="text-left text-[13px] font-num transition-all hover:opacity-70 active:scale-95 cursor-pointer"
        style={{ color: "var(--color-text-primary)" }}
      >
        {formatAmount(value)}
      </button>
    );
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoFocus
      value={withCommas(text)}
      onChange={(e) => setText(digitsOnly(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(String(toDisplay(savedValueRef.current)));
          setEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-8 text-left font-num text-[13px] rounded-lg w-full"
      style={{ borderColor: "var(--color-border-default)", backgroundColor: "var(--color-surface-subtle)" }}
    />
  );
}

function MonthRow({
  m,
  formatAmount,
  displayCurrency,
  vndPerJpy,
  onUpdateIncome,
  onOpenEntries,
  onSaveNote,
}: {
  m: SimulationMonth;
  formatAmount: (jpyAmount: number) => string;
  displayCurrency: DisplayCurrency;
  vndPerJpy: number;
  onUpdateIncome: (month: string, jpyAmount: number) => void;
  onOpenEntries: (month: string, kind: "income" | "expense") => void;
  onSaveNote: (month: string, note: string | null) => void;
}) {
  const negative = m.hasRecord && m.cumulative < 0;

  return (
    <div
      className="group grid items-center px-7 py-3.5 border-b last:border-0"
      style={{
        gridTemplateColumns: GRID_COLS,
        gap: GRID_GAP,
        borderColor: "var(--color-border-subtle)",
        backgroundColor: m.isCurrentMonth ? "#EAF6F4" : "transparent",
      }}
    >
      <span
        className="text-[14.5px] font-semibold flex items-center gap-2 min-w-0"
        style={{ color: m.isCurrentMonth ? "var(--color-primary-hover)" : "var(--color-text-primary)" }}
      >
        {m.label}
        {m.isCurrentMonth && (
          <Tag
            className="text-[10.5px] font-bold px-2 py-0.5 shrink-0"
            style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
          >
            NOW
          </Tag>
        )}
        {m.hasRecord && (
          <NoteTag
            value={m.note}
            onSave={(v) => onSaveNote(m.month, v)}
            placeholder="e.g. Japan trip"
          />
        )}
      </span>
      {!m.hasRecord ? (
        <span className="col-span-6 text-left text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No data
        </span>
      ) : (
        <>
          <IncomeInput
            value={m.regularIncome}
            displayCurrency={displayCurrency}
            vndPerJpy={vndPerJpy}
            formatAmount={formatAmount}
            onSave={(n) => onUpdateIncome(m.month, n)}
          />
          <button
            type="button"
            onClick={() => onOpenEntries(m.month, "income")}
            className="text-left text-sm font-num transition-all hover:opacity-70 active:scale-95 cursor-pointer"
            style={{ color: "var(--color-success)" }}
          >
            {formatAmount(m.income - m.regularIncome)}
          </button>
          <span
            className="text-left text-sm font-num"
            title={m.isCurrentMonth ? "This month's forecast" : m.isFuture ? "Total Monthly Budget" : "Actual VN spend"}
            style={{ color: m.expense > 0 ? "var(--color-text-secondary)" : "var(--color-text-subtle)" }}
          >
            {m.expense > 0 ? formatAmount(m.expense) : "—"}
          </span>
          <button
            type="button"
            onClick={() => onOpenEntries(m.month, "expense")}
            className="text-left text-sm font-num transition-all hover:opacity-70 active:scale-95 cursor-pointer"
            style={{ color: m.specialExpenseTotal > 0 ? "var(--color-danger)" : "var(--color-text-secondary)" }}
          >
            {m.specialExpenseTotal > 0 ? formatAmount(m.specialExpenseTotal) : "—"}
          </button>
          <span className="text-left text-sm font-num font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {formatAmount(m.remaining)}
          </span>
          <span
            className="text-left font-num text-sm font-bold flex items-center justify-start gap-1.5"
            style={{ color: negative ? "var(--color-danger)" : "var(--color-text-primary)" }}
          >
            {negative && <AlertTriangle size={14} style={{ color: "var(--color-danger)" }} />}
            {formatAmount(m.cumulative)}
          </span>
        </>
      )}
    </div>
  );
}

function SpecialEntriesDialog({
  open,
  onOpenChange,
  month,
  kind,
  entries,
  formatAmount,
  vndPerJpy,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: string;
  kind: "income" | "expense";
  entries: SpecialEntry[];
  formatAmount: (jpyAmount: number) => string;
  vndPerJpy: number;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [currency, setCurrency] = useState<"JPY" | "VND">("JPY");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setAmountText("");
      setCurrency("JPY");
    }
  }, [open]);

  const handleAdd = async () => {
    const amount = parseInt(digitsOnly(amountText), 10) || 0;
    if (!name.trim() || amount === 0) return;
    setSaving(true);
    const res = await fetch("/api/simulation/special-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, kind, name: name.trim(), amount, currency }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    setName("");
    setAmountText("");
    onChanged();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/simulation/special-entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    onChanged();
  };

  const title = kind === "income" ? "Special income" : "Special expense";
  const isExpense = kind === "expense";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title} — {month}</DialogTitle>
        </DialogHeader>
        <div className="px-1 space-y-3">
          {isExpense && (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Add a planned expense yourself, or mark a transaction as &quot;Special expense&quot; in Transactions to add one automatically.
            </p>
          )}
          {entries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              No entries yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => {
                const entryJpy = e.currency === "VND" ? e.amount / vndPerJpy : e.amount;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="truncate block" style={{ color: "var(--color-text-primary)" }}>{e.name}</span>
                      <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                        Entered as {e.currency === "VND" ? formatVND(e.amount) : formatJPY(e.amount)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="font-num font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {formatAmount(entryJpy)}
                      </span>
                      {e.source === "manual" ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(e.id)}
                          className="text-xs font-medium cursor-pointer transition-all hover:opacity-70 active:scale-90"
                          style={{ color: "var(--color-danger)" }}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                          From Transactions
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div
            className="flex items-center gap-2 pt-3"
            style={{ borderTop: "1px solid var(--color-border-subtle)" }}
          >
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Amount"
              value={withCommas(amountText)}
              onChange={(e) => setAmountText(digitsOnly(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="w-24 font-num"
            />
            <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid var(--color-border-default)" }}>
              {(["JPY", "VND"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className="px-2 h-9 text-xs font-semibold cursor-pointer transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: currency === c ? "var(--color-primary)" : "transparent",
                    color: currency === c ? "#fff" : "var(--color-text-secondary)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleAdd} disabled={saving || !name.trim()}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SimpleNote {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

// Low-key notes feature: an icon button with a count badge that opens a
// small popover — just freeform comments, no threads/tasks/titles.
function NotesPopover() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<SimpleNote[] | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/simulation/notes");
    if (!res.ok) return;
    setNotes(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const res = await fetch("/api/simulation/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to save note");
      return;
    }
    setText("");
    load();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/simulation/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete note");
      return;
    }
    load();
  };

  const startEdit = (n: SimpleNote) => {
    setEditingId(n.id);
    setEditingText(n.body);
  };

  const saveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    const res = await fetch(`/api/simulation/notes/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editingText.trim() }),
    });
    if (!res.ok) {
      toast.error("Failed to save note");
      return;
    }
    setEditingId(null);
    load();
  };

  const count = notes?.length ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) load();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Notes"
          className="relative flex items-center justify-center h-[34px] w-[34px] rounded-full cursor-pointer transition-all hover:bg-muted/40 active:scale-95"
          style={{ color: "var(--color-text-subtle)" }}
        >
          <StickyNote size={16} />
          {count > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: "var(--color-text-subtle)", color: "var(--color-surface)" }}
            >
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] mb-2" style={{ color: "var(--color-text-subtle)" }}>
          Notes
        </p>
        {!notes ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : notes.length === 0 ? (
          <p className="text-sm py-2 text-center" style={{ color: "var(--color-text-secondary)" }}>
            No notes yet.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto mb-2 pr-0.5">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg px-2.5 py-2"
                style={{ border: "1px solid var(--color-border-default)", backgroundColor: "var(--color-surface-subtle)" }}
              >
                {editingId === n.id ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="text-sm"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] active:scale-95"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[11px] active:scale-95"
                        onClick={saveEdit}
                        disabled={!editingText.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      onClick={() => startEdit(n)}
                      className="text-sm whitespace-pre-wrap cursor-pointer transition-opacity hover:opacity-70"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {n.body}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10.5px]" style={{ color: "var(--color-text-subtle)" }}>
                        {formatNoteTime(n.updated_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        className="cursor-pointer transition-all hover:opacity-70 active:scale-90"
                        style={{ color: "var(--color-text-subtle)" }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-1.5 pt-2" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <Textarea
            placeholder="Add a note…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="text-sm flex-1"
            rows={2}
          />
          <Button size="sm" className="h-8 active:scale-95" onClick={handleAdd} disabled={saving || !text.trim()}>
            <Plus size={14} />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function SimulationPage() {
  const [year] = useState(() => new Date().getFullYear());
  const [data, setData] = useState<SimulationData | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("JPY");
  const [entriesDialog, setEntriesDialog] = useState<{ month: string; kind: "income" | "expense" } | null>(null);

  const load = useCallback(async (y: number) => {
    const res = await fetch(`/api/simulation?year=${y}`);
    if (!res.ok) return;
    const json: SimulationData = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    setData(null);
    load(year);
  }, [year, load]);

  const handleUpdateIncome = async (month: string, income: number) => {
    const res = await fetch(`/api/simulation/months/${month}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ income }),
    });
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    load(year);
  };

  const handleSaveNote = async (month: string, note: string | null) => {
    const res = await fetch(`/api/simulation/months/${month}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    load(year);
  };

  const vndPerJpy = data?.vndPerJpy ?? 1;
  const formatAmount = makeFormatAmount(displayCurrency, vndPerJpy);

  const savingsRatePct =
    data && data.annualIncome > 0
      ? Math.max(0, Math.min(100, Math.round((data.annualRemaining / data.annualIncome) * 100)))
      : 0;

  const editingMonth = data?.months.find((m) => m.month === entriesDialog?.month);
  const editingEntries = entriesDialog
    ? (entriesDialog.kind === "income" ? editingMonth?.specialIncomes : editingMonth?.specialExpenses) ?? []
    : [];

  return (
    <div>
      <div className="mt-8 mb-5 flex items-center justify-end gap-2">
        <NotesPopover />
        <CurrencySwitch value={displayCurrency} onChange={setDisplayCurrency} />
      </div>

      <Card
        className="p-5 rounded-2xl mb-5"
        style={{ borderColor: "var(--color-border-default)", boxShadow: CARD_SHADOW }}
      >
        {!data ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="font-display text-[32px] font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>
              {formatAmount(data.yearEndProjection)}
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1 font-num font-bold text-[15px]" style={{ color: "var(--color-success)" }}>
                <TrendingUp size={14} />
                {formatAmount(data.annualIncome)}
              </span>
              <span className="text-[15px] font-semibold" style={{ color: "var(--color-text-subtle)" }}>−</span>
              <span className="flex items-center gap-1 font-num font-bold text-[15px]" style={{ color: "var(--color-text-secondary)" }}>
                <TrendingDown size={14} />
                {formatAmount(data.annualExpense + data.annualSpecialExpense)}
              </span>
              <span className="text-[15px] font-semibold" style={{ color: "var(--color-text-subtle)" }}>=</span>
              <span className="font-num font-bold text-[16px]" style={{ color: "var(--color-text-primary)" }}>
                {formatAmount(data.annualRemaining)}
              </span>
            </div>
            {data.annualIncome > 0 && (
              <p className="text-xs font-medium" style={{ color: "var(--color-primary-hover)" }}>
                Saving {savingsRatePct}% of income
              </p>
            )}
          </div>
        )}
      </Card>

      <Card
        className="rounded-2xl overflow-hidden p-0"
        style={{ borderColor: "var(--color-border-default)", boxShadow: CARD_SHADOW }}
      >
        <div
          className="grid px-7 py-4 border-b"
          style={{ gridTemplateColumns: GRID_COLS, gap: GRID_GAP, borderColor: "var(--color-border-default)" }}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.05em]" style={{ color: "var(--color-text-subtle)" }}>Month</span>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-left" style={{ color: "var(--color-text-subtle)" }}>Income</span>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-left" style={{ color: "var(--color-text-subtle)" }}>Special income</span>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-left" style={{ color: "var(--color-text-subtle)" }}>Expense</span>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-left" style={{ color: "var(--color-text-subtle)" }}>Special expense</span>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-left" style={{ color: "var(--color-text-subtle)" }}>Remaining</span>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-left" style={{ color: "var(--color-text-subtle)" }}>Cumulative</span>
        </div>
        {!data ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        ) : (
          data.months.map((m) => (
            <MonthRow
              key={m.month}
              m={m}
              formatAmount={formatAmount}
              displayCurrency={displayCurrency}
              vndPerJpy={vndPerJpy}
              onUpdateIncome={handleUpdateIncome}
              onOpenEntries={(month, kind) => setEntriesDialog({ month, kind })}
              onSaveNote={handleSaveNote}
            />
          ))
        )}
      </Card>

      {entriesDialog && (
        <SpecialEntriesDialog
          open={entriesDialog !== null}
          onOpenChange={(v) => {
            if (!v) setEntriesDialog(null);
          }}
          month={entriesDialog.month}
          kind={entriesDialog.kind}
          entries={editingEntries}
          formatAmount={formatAmount}
          vndPerJpy={vndPerJpy}
          onChanged={() => load(year)}
        />
      )}
    </div>
  );
}
