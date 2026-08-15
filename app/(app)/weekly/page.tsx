"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  type MouseHandlerDataParam,
} from "recharts";
import { List, Sparkles, LineChart as LineChartIcon, Table as TableIcon, TrendingUp, TrendingDown } from "lucide-react";
import { formatVND, formatJPY } from "@/lib/format";
import { getCategoryColors, getCategoryHex } from "@/lib/category-colors";
import { getCategoryIcon } from "@/lib/category-icons";
import { CurrencySwitch, type DisplayCurrency } from "@/components/currency-switch";
import { makeFormatAmount, VND_PER_JPY } from "@/lib/currency";
import { NoteTag } from "@/components/note-tag";
import { SpecialExpenseToggle } from "@/components/special-expense-toggle";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ChartContainer,
  ChartTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
  type ChartConfig,
} from "@takaki/go-design-system";

interface PeriodItem {
  label: string;
  total: number;
  byCategory: Record<string, number>;
  start: string;
  end: string;
}
interface TxItem {
  id: string;
  store: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
  excluded_from_dashboard: boolean;
  special_entry_id: string | null;
}
interface ReportData {
  periods: PeriodItem[];
  topCategories: string[];
  categoryFixed: Record<string, boolean>;
  categoryType: string;
  includeSpecial: boolean;
}
type CategoryType = "all" | "variable" | "fixed";
type ViewMode = "chart" | "table";

// 積み上げチャートで個別に表示するカテゴリの上限。超えた分は "Other" にまとめる
// (このページ内のツールチップも同じ8件しきい値で2カラムに切り替えている)。
const STACK_LIMIT = 8;
const OTHER_KEY = "Other";

interface ChartRow {
  label: string;
  start: string;
  end: string;
  total: number;
  prevTotal: number | null;
  value: number; // 単一カテゴリ選択時の面グラフ用(表示通貨換算済み)
  byCategoryFull: Record<string, number>; // 全カテゴリ、換算済み(ツールチップの単一カテゴリ表示用)
  prevByCategoryFull: Record<string, number> | null;
  byCategory: Record<string, number>; // STACK_LIMIT + Other にまとめた版(積み上げ・グループツールチップ用)
  prevByCategory: Record<string, number> | null;
}

interface Delta {
  diff: number;
  pct: number | null; // null = 前月0円からの新規発生
}

function computeDelta(current: number, prev: number | null): Delta | null {
  if (prev === null) return null;
  const diff = current - prev;
  if (prev === 0) return { diff, pct: current === 0 ? 0 : null };
  return { diff, pct: (diff / prev) * 100 };
}

// 支出が増えた(diff>0)ことを danger 色、減った(diff<0)ことを success 色で示す
// ± インジケータ。金額ベースの増減が視覚的にすぐ分かるようにするためのもの。
function DeltaBadge({ delta }: { delta: Delta }) {
  if (delta.diff === 0) {
    return (
      <span className="text-[11px] font-medium" style={{ color: "var(--color-text-subtle)" }}>
        ±0%
      </span>
    );
  }
  const up = delta.diff > 0;
  const color = up ? "var(--color-danger)" : "var(--color-success)";
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold shrink-0" style={{ color }}>
      <Icon size={11} />
      {delta.pct !== null ? `${Math.abs(Math.round(delta.pct))}%` : "new"}
    </span>
  );
}

// STACK_LIMIT を超えるカテゴリを Other にまとめる。
function collapseByCategory(byCategory: Record<string, number>, order: string[]): Record<string, number> {
  const known = new Set(order.filter((n) => n !== OTHER_KEY));
  const result: Record<string, number> = {};
  let other = 0;
  for (const [name, amt] of Object.entries(byCategory)) {
    if (known.has(name)) result[name] = (result[name] ?? 0) + amt;
    else other += amt;
  }
  if (order.includes(OTHER_KEY) && other > 0) result[OTHER_KEY] = other;
  return result;
}

function ChartTooltipContent({
  active,
  payload,
  filter,
  categoryType,
  categoryFixed,
  formatAmount,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
  filter: string;
  categoryType: CategoryType;
  categoryFixed: Record<string, boolean>;
  formatAmount: (amount: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  if (filter === "all") {
    const entries = Object.entries(row.byCategory);
    const totalDelta = computeDelta(row.total, row.prevTotal);
    const grouped = categoryType === "all";

    const renderEntries = (items: [string, number][]) =>
      [...items]
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amt]) => {
          const prevAmt = row.prevByCategory?.[cat] ?? (row.prevByCategory ? 0 : null);
          const delta = computeDelta(amt, prevAmt);
          return (
            <div key={cat} className="flex items-center justify-between gap-3">
              <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>{cat}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                {delta && <DeltaBadge delta={delta} />}
                <span className="font-num font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {formatAmount(amt)}
                </span>
              </span>
            </div>
          );
        });

    const variableEntries = grouped ? entries.filter(([c]) => c !== OTHER_KEY && !categoryFixed[c]) : [];
    const fixedEntries = grouped ? entries.filter(([c]) => c !== OTHER_KEY && categoryFixed[c]) : [];
    const otherEntry = entries.filter(([c]) => c === OTHER_KEY);
    const twoCol = entries.length > 8;

    return (
      <div
        className={cn("rounded-lg border bg-background px-3 py-2 text-xs shadow-sm", twoCol ? "min-w-[26rem]" : "min-w-52")}
        style={{ borderColor: "var(--color-border-default)" }}
      >
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{row.label}</p>
          {totalDelta && <DeltaBadge delta={totalDelta} />}
        </div>
        {entries.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)" }}>No data</p>
        ) : grouped ? (
          <div className="space-y-2.5">
            {variableEntries.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-subtle)" }}>
                  Variable
                </p>
                <div className={cn("gap-x-5 gap-y-1", twoCol ? "grid grid-cols-2" : "space-y-1")}>
                  {renderEntries(variableEntries)}
                </div>
              </div>
            )}
            {fixedEntries.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-subtle)" }}>
                  Fixed
                </p>
                <div className={cn("gap-x-5 gap-y-1", twoCol ? "grid grid-cols-2" : "space-y-1")}>
                  {renderEntries(fixedEntries)}
                </div>
              </div>
            )}
            {otherEntry.length > 0 && <div className="space-y-1">{renderEntries(otherEntry)}</div>}
          </div>
        ) : (
          <div className={cn("gap-x-5 gap-y-1", twoCol ? "grid grid-cols-2" : "space-y-1")}>
            {renderEntries(entries)}
          </div>
        )}
        <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--color-border-default)" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>Total</span>
          <span className="font-num font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {formatAmount(row.total)}
          </span>
        </div>
      </div>
    );
  }

  const amount = row.byCategoryFull[filter] ?? 0;
  const prevAmount = row.prevByCategoryFull ? (row.prevByCategoryFull[filter] ?? 0) : null;
  const delta = computeDelta(amount, prevAmount);
  const pct = row.total > 0 ? Math.round((amount / row.total) * 100) : 0;
  return (
    <div
      className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm min-w-44"
      style={{ borderColor: "var(--color-border-default)" }}
    >
      <div className="flex items-center justify-between gap-4 mb-1.5">
        <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{row.label}</p>
        {delta && <DeltaBadge delta={delta} />}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>{filter}</span>
        <span className="font-num font-medium shrink-0" style={{ color: "var(--color-text-primary)" }}>
          {formatAmount(amount)}
        </span>
      </div>
      <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--color-border-default)" }}>
        <span style={{ color: "var(--color-text-secondary)" }}>% of total</span>
        <span className="font-num font-semibold" style={{ color: "var(--color-text-primary)" }}>{pct}%</span>
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  value,
  active,
  onSelect,
}: {
  label: string;
  value: string;
  active: boolean;
  onSelect: (value: string) => void;
}) {
  const Icon = value !== "all" ? getCategoryIcon(value) : Sparkles;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(value)}
          aria-pressed={active}
          aria-label={label}
          className="inline-flex items-center justify-center rounded-full border h-9 w-9 transition-all cursor-pointer hover:opacity-80 active:scale-95 active:opacity-70"
          style={
            active
              ? { backgroundColor: "var(--color-text-primary)", borderColor: "var(--color-text-primary)", color: "#FFFFFF" }
              : { backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-default)", color: "#5B5346" }
          }
        >
          <Icon size={15} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// 期間 x カテゴリの一覧表。Allタブでは固定費/変動費をグループ化して表示する。
// 直近月の「先月比」を各カテゴリ・合計行の末尾に表示する。
function ReportTable({
  data,
  categoryType,
  formatAmount,
  onCellClick,
}: {
  data: ReportData;
  categoryType: CategoryType;
  formatAmount: (vnd: number) => string;
  onCellClick: (period: PeriodItem, category: string) => void;
}) {
  const periods = data.periods;
  const lastIdx = periods.length - 1;

  const names = useMemo(() => {
    if (categoryType !== "all") return data.topCategories;
    return [
      ...data.topCategories.filter((n) => !data.categoryFixed[n]),
      ...data.topCategories.filter((n) => data.categoryFixed[n]),
    ];
  }, [data, categoryType]);

  const rowFor = useCallback(
    (name: string) => {
      const values = periods.map((p) => p.byCategory[name] ?? 0);
      const latest = values[lastIdx] ?? 0;
      const prev = lastIdx > 0 ? values[lastIdx - 1] : null;
      return { name, values, delta: computeDelta(latest, prev) };
    },
    [periods, lastIdx],
  );

  const variableRows = (categoryType === "all" ? names.filter((n) => !data.categoryFixed[n]) : names).map(rowFor);
  const fixedRows = categoryType === "all" ? names.filter((n) => data.categoryFixed[n]).map(rowFor) : [];

  const totalsByPeriod = periods.map((p) => names.reduce((s, n) => s + (p.byCategory[n] ?? 0), 0));
  const totalLatest = totalsByPeriod[lastIdx] ?? 0;
  const totalPrev = lastIdx > 0 ? totalsByPeriod[lastIdx - 1] : null;
  const totalDelta = computeDelta(totalLatest, totalPrev);

  const renderRow = (row: { name: string; values: number[]; delta: Delta | null }) => (
    <TableRow key={row.name}>
      <TableCell className="font-medium whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>
        {row.name}
      </TableCell>
      {row.values.map((v, i) => (
        <TableCell
          key={i}
          onClick={() => v > 0 && onCellClick(periods[i], row.name)}
          className={cn("text-right font-num", v > 0 && "cursor-pointer hover:underline")}
          style={{ color: v > 0 ? "var(--color-text-primary)" : "var(--color-text-subtle)" }}
        >
          {v > 0 ? formatAmount(v) : "–"}
        </TableCell>
      ))}
      <TableCell className="text-right">{row.delta && <DeltaBadge delta={row.delta} />}</TableCell>
    </TableRow>
  );

  const groupHeader = (label: string) => (
    <TableRow key={`group-${label}`}>
      <TableCell
        colSpan={periods.length + 2}
        className="text-[10px] font-semibold uppercase tracking-wide py-1.5"
        style={{ color: "var(--color-text-subtle)", backgroundColor: "var(--color-surface-subtle)" }}
      >
        {label}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Category</TableHead>
            {periods.map((p) => (
              <TableHead key={p.label} className="text-right whitespace-nowrap">
                {p.label}
              </TableHead>
            ))}
            <TableHead className="text-right whitespace-nowrap">MoM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categoryType === "all" && variableRows.length > 0 && groupHeader("Variable")}
          {variableRows.map(renderRow)}
          {categoryType === "all" && fixedRows.length > 0 && groupHeader("Fixed")}
          {fixedRows.map(renderRow)}
          <TableRow>
            <TableCell className="font-bold" style={{ color: "var(--color-text-primary)" }}>Total</TableCell>
            {totalsByPeriod.map((v, i) => (
              <TableCell
                key={i}
                onClick={() => v > 0 && onCellClick(periods[i], "all")}
                className={cn("text-right font-num font-bold", v > 0 && "cursor-pointer hover:underline")}
                style={{ color: "var(--color-text-primary)" }}
              >
                {formatAmount(v)}
              </TableCell>
            ))}
            <TableCell className="text-right">{totalDelta && <DeltaBadge delta={totalDelta} />}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [categoryType, setCategoryType] = useState<CategoryType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [includeSpecial, setIncludeSpecial] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("VND");
  const [detail, setDetail] = useState<{
    label: string;
    category: string;
    txs: TxItem[] | null;
  } | null>(null);

  const fetchData = useCallback(async (type: CategoryType, special: boolean) => {
    setData(null);
    const res = await fetch(`/api/weekly?type=${type}&includeSpecial=${special}`);
    if (!res.ok) return;
    const json: ReportData = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    fetchData(categoryType, includeSpecial);
  }, [categoryType, includeSpecial, fetchData]);

  useEffect(() => {
    if (
      categoryFilter !== "all" &&
      data &&
      !data.topCategories.includes(categoryFilter)
    ) {
      setCategoryFilter("all");
    }
  }, [data, categoryFilter]);

  // API はすべて VND で返してくる。表示通貨が JPY のときはグラフに渡す
  // 数値そのものを換算しておかないと、軸・面グラフのスケールが実際の
  // 金額と一致しない（フォーマット関数だけ差し替えても数値がVNDのまま）。
  const toDisplayScale = useCallback(
    (vnd: number) => (displayCurrency === "VND" ? vnd : vnd / VND_PER_JPY),
    [displayCurrency],
  );

  // 積み上げグラフ・グループツールチップで個別表示するカテゴリの並び順。
  // Allタブでは変動費→固定費の順に並べ、積み上げの帯がグループごとに
  // まとまって見えるようにする。上限を超えた分は Other に集約。
  const seriesOrder = useMemo<string[]>(() => {
    if (!data) return [];
    let names = data.topCategories;
    if (categoryType === "all") {
      names = [
        ...names.filter((n) => !data.categoryFixed[n]),
        ...names.filter((n) => data.categoryFixed[n]),
      ];
    }
    const capped = names.slice(0, STACK_LIMIT);
    return names.length > STACK_LIMIT ? [...capped, OTHER_KEY] : capped;
  }, [data, categoryType]);

  const chartData: ChartRow[] = useMemo(() => {
    if (!data) return [];
    const scaledRows = data.periods.map((p) => ({
      label: p.label,
      start: p.start,
      end: p.end,
      total: toDisplayScale(p.total),
      byCategoryFull: Object.fromEntries(
        Object.entries(p.byCategory ?? {}).map(([cat, amt]) => [cat, toDisplayScale(amt)]),
      ),
    }));
    return scaledRows.map((r, i) => {
      const prev = i > 0 ? scaledRows[i - 1] : null;
      return {
        label: r.label,
        start: r.start,
        end: r.end,
        total: r.total,
        prevTotal: prev ? prev.total : null,
        value: categoryFilter === "all" ? r.total : (r.byCategoryFull[categoryFilter] ?? 0),
        byCategoryFull: r.byCategoryFull,
        prevByCategoryFull: prev ? prev.byCategoryFull : null,
        byCategory: collapseByCategory(r.byCategoryFull, seriesOrder),
        prevByCategory: prev ? collapseByCategory(prev.byCategoryFull, seriesOrder) : null,
      };
    });
  }, [data, categoryFilter, seriesOrder, toDisplayScale]);

  // detail ダイアログの取引一覧は /api/transactions から生の VND 金額を
  // 都度取得するので、こちらは makeFormatAmount で表示時に換算する。
  const formatAmount = useMemo(() => makeFormatAmount(displayCurrency), [displayCurrency]);
  // グラフのツールチップ・軸ラベルは chartData 側で既に換算済みの数値を
  // 扱うので、ここでは単位変換をせずフォーマットだけ行う。
  const formatChartAmount = useCallback(
    (amount: number) => (displayCurrency === "VND" ? formatVND(amount) : formatJPY(amount)),
    [displayCurrency],
  );

  const openDetail = useCallback(
    async (period: { label: string; start: string; end: string }, category: string) => {
      setDetail({ label: period.label, category, txs: null });
      try {
        const params = new URLSearchParams({ from: period.start, to: period.end });
        if (category !== "all") params.set("category", category);
        const r = await fetch(`/api/transactions?${params.toString()}`);
        if (!r.ok) throw new Error();
        const txs = (await r.json()) as TxItem[];
        setDetail((d) =>
          d && d.label === period.label && d.category === category
            ? { ...d, txs }
            : d,
        );
      } catch {
        setDetail((d) =>
          d && d.label === period.label && d.category === category
            ? { ...d, txs: [] }
            : d,
        );
      }
    },
    [],
  );

  const handleSaveNote = useCallback(
    async (id: string, note: string | null) => {
      setDetail((d) =>
        d && d.txs
          ? { ...d, txs: d.txs.map((t) => (t.id === id ? { ...t, note } : t)) }
          : d,
      );
      await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
    },
    [],
  );

  const handleToggleSpecialExpense = useCallback(
    async (id: string, next: boolean) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialExpense: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail((d) =>
          d && d.txs
            ? {
                ...d,
                txs: d.txs.map((t) =>
                  t.id === id
                    ? {
                        ...t,
                        excluded_from_dashboard: updated.excluded_from_dashboard,
                        special_entry_id: updated.special_entry_id,
                      }
                    : t,
                ),
              }
            : d,
        );
      }
    },
    [],
  );

  const handleChartClick = useCallback(
    (state: MouseHandlerDataParam) => {
      const row = chartData.find((r) => r.label === state.activeLabel);
      if (row) openDetail(row, categoryFilter);
    },
    [chartData, openDetail, categoryFilter],
  );

  const chartColor =
    categoryFilter === "all"
      ? "#BE5B85"
      : getCategoryColors(categoryFilter).text;

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: categoryFilter === "all" ? "Total" : categoryFilter,
        color: chartColor,
      },
    }),
    [categoryFilter, chartColor],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full min-h-0">
      <div className="mt-8 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <Tabs
          value={categoryType}
          onValueChange={(v) => {
            setCategoryType(v as CategoryType);
            setCategoryFilter("all");
          }}
        >
          <TabsList
            className="p-1 rounded-[11px] h-auto gap-1 border-b-0"
            style={{ backgroundColor: "var(--kg-track)" }}
          >
            {(["all", "variable", "fixed"] as const).map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                className="rounded-lg px-[18px] py-2 text-sm font-semibold capitalize border-b-0 transition-all hover:opacity-70 active:scale-[0.96] active:opacity-60"
                style={
                  categoryType === v
                    ? {
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        boxShadow: "0 1px 2px rgba(120,72,10,.08)",
                      }
                    : { backgroundColor: "transparent", color: "var(--color-text-secondary)", boxShadow: "none" }
                }
              >
                {v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Switch checked={includeSpecial} onCheckedChange={setIncludeSpecial} />
            <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Special expenses
            </span>
          </label>
          <CurrencySwitch value={displayCurrency} onChange={setDisplayCurrency} />
          <div className="flex rounded-[10px] overflow-hidden border" style={{ borderColor: "var(--color-border-default)" }}>
            {(
              [
                { key: "chart", label: "Chart", icon: LineChartIcon },
                { key: "table", label: "Table", icon: TableIcon },
              ] as const
            ).map((m) => (
              <Tooltip key={m.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode(m.key)}
                    aria-pressed={viewMode === m.key}
                    aria-label={m.label}
                    className="flex items-center justify-center h-[38px] w-10 transition-all cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: viewMode === m.key ? "var(--color-text-primary)" : "transparent",
                      color: viewMode === m.key ? "#fff" : "var(--color-text-secondary)",
                    }}
                  >
                    <m.icon size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{m.label} view</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[10px] h-auto py-2.5 px-4 font-semibold hover:opacity-80"
            style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
            onClick={() => router.push("/transactions")}
          >
            <List size={16} />
            Transactions
          </Button>
        </div>
      </div>

      <Card
        className="p-7 rounded-2xl flex-1 flex flex-col min-h-0"
        style={{
          borderColor: "var(--color-border-default)",
          boxShadow: "0 1px 2px rgba(120,72,10,.04), 0 8px 24px rgba(120,72,10,.05)",
        }}
      >
        {viewMode === "chart" && data && data.topCategories.length > 0 && (
          <div className="flex items-center justify-end gap-2 mb-6 flex-wrap shrink-0">
            <CategoryChip
              label="All"
              value="all"
              active={categoryFilter === "all"}
              onSelect={setCategoryFilter}
            />
            {data.topCategories.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                value={cat}
                active={categoryFilter === cat}
                onSelect={setCategoryFilter}
              />
            ))}
          </div>
        )}

        {data === null ? (
          <div className="flex flex-1 min-h-0 items-center justify-center">
            <Skeleton className="h-48 w-full rounded" />
          </div>
        ) : viewMode === "table" ? (
          <ReportTable
            data={data}
            categoryType={categoryType}
            formatAmount={formatAmount}
            onCellClick={(period, category) => openDetail(period, category)}
          />
        ) : chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto flex-1 min-h-0 w-full"
          >
            <AreaChart
              data={chartData}
              onClick={handleChartClick}
              style={{ cursor: "pointer" }}
            >
              <defs>
                <linearGradient id="reportTotalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border-default)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "var(--color-text-subtle)", fontSize: 12.5 }}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "var(--color-text-subtle)", fontSize: 12.5 }}
              />
              <ChartTooltip
                cursor={false}
                allowEscapeViewBox={{ x: false, y: true }}
                content={
                  <ChartTooltipContent
                    filter={categoryFilter}
                    categoryType={categoryType}
                    categoryFixed={data.categoryFixed}
                    formatAmount={formatChartAmount}
                  />
                }
              />
              {categoryFilter === "all" ? (
                seriesOrder.map((name) => (
                  <Area
                    key={name}
                    dataKey={(row: ChartRow) => row.byCategory[name] ?? 0}
                    name={name}
                    type="natural"
                    stackId="stack"
                    stroke={name === OTHER_KEY ? "var(--color-text-subtle)" : getCategoryHex(name)}
                    fill={name === OTHER_KEY ? "var(--color-text-subtle)" : getCategoryHex(name)}
                    fillOpacity={0.6}
                    strokeWidth={1}
                  />
                ))
              ) : (
                <Area
                  dataKey="value"
                  type="natural"
                  fill="url(#reportTotalFill)"
                  stroke={chartColor}
                  strokeWidth={3}
                />
              )}
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-1 min-h-0 items-center justify-center">
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No data</p>
          </div>
        )}
      </Card>

      <Dialog
        open={detail !== null}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-7 py-5 border-b" style={{ borderColor: "var(--color-border-default)" }}>
            <DialogTitle className="flex items-center gap-2">
              {detail?.label}
              {detail && detail.category !== "all" && (
                <span className="text-sm font-normal" style={{ color: "var(--color-text-secondary)" }}>
                  {detail.category}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-7 py-5">
            {detail?.txs === null ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : detail && detail.txs.length === 0 ? (
              <p className="text-center py-10 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                No spending in this period.
              </p>
            ) : (
              <>
                <ul className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
                  {detail?.txs?.map((t) => (
                    <li
                      key={t.id}
                      className="group flex items-center justify-between gap-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                          {t.store}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {new Date(t.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {t.category}
                        </p>
                      </div>
                      <NoteTag value={t.note} onSave={(v) => handleSaveNote(t.id, v)} />
                      <SpecialExpenseToggle
                        active={t.special_entry_id !== null}
                        onToggle={(v) => handleToggleSpecialExpense(t.id, v)}
                      />
                      <span className="font-num text-sm shrink-0" style={{ color: "var(--color-text-primary)" }}>
                        {formatAmount(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                {detail && detail.txs.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border-default)" }}>
                    <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Total</span>
                    <span className="font-num font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {formatAmount(
                        detail.txs.reduce((sum, t) => sum + t.amount, 0),
                      )}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
