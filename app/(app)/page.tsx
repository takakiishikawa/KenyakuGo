"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { PieChart, Pie, Cell } from "recharts";
import {
  TrendingDown,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { toast } from "@takaki/go-design-system";
import { formatVND, formatDate } from "@/lib/format";
import { getCategoryColors } from "@/lib/category-colors";
import {
  Button,
  Card,
  Badge,
  PageHeader,
  Skeleton,
  Dialog,
  DialogContent,
  Tag,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@takaki/go-design-system";

const DONUT_COLORS = [
  "#2D6A4F",
  "#52B788",
  "#95D5B2",
  "#FFB74D",
  "#C084FC",
  "#38BDF8",
  "#F87171",
];

interface DashboardData {
  thisMonthTotal: number;
  projectedMonthTotal: number | null;
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekDiff: number;
  cumulativeBalance: number;
  targetMonthly: number;
  categoryBreakdown: { name: string; value: number }[];
  prevCategoryBreakdown: Record<string, number>;
  recentTransactions: {
    id: string;
    store: string;
    amount: number;
    category: string;
    date: string;
  }[];
}

interface DashboardFeedback {
  summary: string;
  point: string;
  tip: string;
}

interface TxItem {
  id: string;
  store: string;
  amount: number;
  category: string;
  date: string;
}

function useCountUp(target: number | null, duration = 700) {
  const [value, setValue] = useState(0);
  const targetRef = useRef(target);
  useEffect(() => {
    if (target === null) return;
    if (targetRef.current === target && value === target) return;
    targetRef.current = target;
    let current = 0;
    const steps = Math.ceil(duration / 16);
    const step = target / steps;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else setValue(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

function CategoryBadge({ category }: { category: string }) {
  const { bg, text } = getCategoryColors(category);
  const isUncategorized = category === "その他";
  return (
    <Tag
      color={isUncategorized ? "danger" : undefined}
      style={
        isUncategorized
          ? undefined
          : { backgroundColor: bg, color: text, borderColor: "transparent" }
      }
    >
      {isUncategorized ? "未分類" : category}
    </Tag>
  );
}

function CategoryPopup({
  category,
  color,
  onClose,
}: {
  category: string;
  color: string;
  onClose: () => void;
}) {
  const [txs, setTxs] = useState<TxItem[] | null>(null);

  useEffect(() => {
    fetch(
      `/api/transactions?period=last7&category=${encodeURIComponent(category)}`,
    )
      .then((r) => r.json())
      .then((data) => setTxs(data as TxItem[]))
      .catch(() => {
        toast.error("データ取得に失敗しました");
        onClose();
      });
  }, [category, onClose]);

  const total = txs ? txs.reduce((s, t) => s + t.amount, 0) : 0;

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden flex flex-col gap-0">
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b pr-14">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {category}
              </h2>
              <p className="text-sm text-muted-foreground">直近7日間</p>
            </div>
          </div>
          <p
            className="font-num text-xl font-semibold"
            style={{ color: "var(--kg-accent)" }}
          >
            {formatVND(total)}
          </p>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
          {txs === null ? (
            <div className="px-6 py-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : txs.length === 0 ? (
            <p className="text-sm text-center py-10 text-muted-foreground">
              この期間の取引はありません
            </p>
          ) : (
            <div>
              {txs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-6 py-3.5 border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">
                      {tx.store}
                    </p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                  <p className="font-num text-sm font-semibold ml-4 shrink-0 text-foreground">
                    {formatVND(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WeekComparePopup({
  thisWeekTotal,
  lastWeekTotal,
  weekDiff,
  categoryBreakdown,
  prevCategoryBreakdown,
  onClose,
}: {
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekDiff: number;
  categoryBreakdown: { name: string; value: number }[];
  prevCategoryBreakdown: Record<string, number>;
  onClose: () => void;
}) {
  const allCategories = Array.from(
    new Set([
      ...categoryBreakdown.map((c) => c.name),
      ...Object.keys(prevCategoryBreakdown),
    ]),
  );
  const rows = allCategories
    .map((cat) => {
      const current = categoryBreakdown.find((c) => c.name === cat)?.value ?? 0;
      const prev = prevCategoryBreakdown[cat] ?? 0;
      const diff =
        prev > 0 ? Math.round(((current - prev) / prev) * 100) : null;
      return { cat, current, prev, diff };
    })
    .sort((a, b) => b.current - a.current);
  const improved = weekDiff <= 0;

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden flex flex-col gap-0">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b pr-14">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              直近7日間 vs 前の7日間
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              カテゴリ別の支出変化
            </p>
          </div>
          <span
            className="font-num text-2xl font-semibold"
            style={{
              color: improved ? "var(--kg-success)" : "var(--kg-danger)",
            }}
          >
            {weekDiff > 0 ? "+" : ""}
            {weekDiff}%
          </span>
        </div>

        {/* Totals row */}
        <div className="grid grid-cols-2 border-b text-center">
          <div className="px-6 py-4 border-r">
            <p className="text-sm text-muted-foreground mb-1">直近7日間</p>
            <p className="font-num text-lg font-semibold text-foreground">
              {formatVND(thisWeekTotal)}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground mb-1">前の7日間</p>
            <p className="font-num text-lg font-semibold text-muted-foreground">
              {formatVND(lastWeekTotal)}
            </p>
          </div>
        </div>

        {/* Category table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-6 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>カテゴリ</span>
          <span className="text-right w-24">前の7日間</span>
          <span className="text-right w-24">直近7日間</span>
          <span className="text-right w-12">変化</span>
        </div>

        {/* Scrollable category rows */}
        <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
          {rows.map(({ cat, current, prev, diff }) => (
            <div
              key={cat}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-6 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-medium text-foreground truncate">
                {cat}
              </span>
              <span className="font-num text-sm text-muted-foreground text-right w-24">
                {prev > 0 ? formatVND(prev) : "—"}
              </span>
              <span className="font-num text-sm font-medium text-foreground text-right w-24">
                {current > 0 ? formatVND(current) : "—"}
              </span>
              <span
                className="font-num text-sm font-semibold text-right w-12"
                style={{
                  color:
                    diff === null
                      ? "var(--kg-text-muted)"
                      : diff <= 0
                        ? "var(--kg-success)"
                        : "var(--kg-danger)",
                }}
              >
                {diff !== null ? `${diff > 0 ? "+" : ""}${diff}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [feedback, setFeedback] = useState<DashboardFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "upToDate">("idle");
  const [syncProgress, setSyncProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [popupCategory, setPopupCategory] = useState<{
    name: string;
    colorIndex: number;
  } | null>(null);
  const [showWeekCompare, setShowWeekCompare] = useState(false);

  const monthTotal = useCountUp(data?.thisMonthTotal ?? null);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    if (!res.ok) return;
    setData(json);
    if (json.categoryBreakdown?.length > 0) {
      setFeedbackLoading(true);
      const r = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dashboard",
          data: Object.fromEntries(
            json.categoryBreakdown.map((c: { name: string; value: number }) => [
              c.name,
              c.value,
            ]),
          ),
        }),
      });
      const result = await r.json();
      if (result.feedback) setFeedback(result.feedback as DashboardFeedback);
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncState("idle");
    setSyncProgress(null);
    let totalSynced = 0;
    let estimatedTotal = 0;
    let processed = 0;

    try {
      while (true) {
        const res = await fetch("/api/gmail/sync");
        let json: { synced?: number; remaining?: number; error?: string } = {};
        try {
          json = await res.json();
        } catch {
          toast.error(
            "同期失敗: サーバーエラー（タイムアウトの可能性があります）",
          );
          break;
        }
        if (!res.ok) {
          toast.error(`同期失敗: ${json.error ?? res.status}`);
          break;
        }

        const remaining = json.remaining ?? 0;
        totalSynced += json.synced ?? 0;
        processed += 200;

        if (estimatedTotal === 0) estimatedTotal = processed + remaining;
        const done = Math.min(processed, estimatedTotal);
        setSyncProgress({ done, total: estimatedTotal });

        if (remaining === 0) break;
      }

      setSyncState("upToDate");
      if (totalSynced > 0)
        toast.success(`${totalSynced}件の取引を取得しました`);
      setTimeout(() => setSyncState("idle"), 5000);
      fetchDashboard();
    } catch (e) {
      toast.error(
        `同期失敗: ${e instanceof Error ? e.message : "network error"}`,
      );
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const projected = data?.projectedMonthTotal ?? null;
  const target = data?.targetMonthly ?? 0;
  const projVsTarget =
    projected != null && target > 0
      ? projected > target
        ? { text: `目標 ${formatVND(target)} を超過見込み`, ok: false }
        : { text: `目標 ${formatVND(target)} 内で推移中`, ok: true }
      : null;

  const weekImproved = data ? data.weekDiff <= 0 : undefined;

  const donutConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    (data?.categoryBreakdown ?? []).forEach((item, i) => {
      cfg[item.name] = {
        label: item.name,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      };
    });
    return cfg;
  }, [data?.categoryBreakdown]);

  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing && syncProgress
              ? `${syncProgress.done}/${syncProgress.total}件`
              : syncing
                ? "同期中..."
                : syncState === "upToDate"
                  ? "最新の状態"
                  : "同期"}
          </Button>
        }
      />

      <div className="mt-8 grid grid-cols-3 gap-5 mb-8">
        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">
            今月の出費
          </p>
          <p
            className="font-num text-4xl font-semibold leading-none"
            style={{ color: "var(--kg-text)" }}
          >
            {data ? formatVND(monthTotal) : "—"}
          </p>
          {projected && (
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              月末予測{" "}
              <span
                className="font-num"
                style={{
                  color: projVsTarget
                    ? projVsTarget.ok
                      ? "var(--kg-success)"
                      : "var(--kg-danger)"
                    : "var(--kg-text)",
                }}
              >
                {formatVND(projected)}
              </span>
            </p>
          )}
          {projVsTarget && (
            <p
              className="mt-1 text-sm flex items-center gap-1"
              style={{
                color: projVsTarget.ok
                  ? "var(--kg-success)"
                  : "var(--kg-danger)",
              }}
            >
              {projVsTarget.ok ? (
                <TrendingDown size={12} />
              ) : (
                <TrendingUp size={12} />
              )}
              {projVsTarget.text}
            </p>
          )}
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">
            直近7日間の出費
          </p>
          <p
            className="font-num text-4xl font-semibold leading-none"
            style={{ color: "var(--kg-text)" }}
          >
            {data ? formatVND(data.thisWeekTotal) : "—"}
          </p>
          {data && data.lastWeekTotal > 0 && (
            <Button
              variant="ghost"
              className="mt-2 flex items-center gap-1 text-sm font-medium rounded-lg transition-opacity hover:opacity-70 h-auto p-0"
              onClick={() => setShowWeekCompare(true)}
              style={{
                color: weekImproved ? "var(--kg-success)" : "var(--kg-danger)",
              }}
            >
              {weekImproved ? (
                <TrendingDown size={14} />
              ) : (
                <TrendingUp size={14} />
              )}
              {weekImproved
                ? `前の7日間より倹約（${Math.abs(data.weekDiff)}%↓）`
                : `前の7日間より増加（${data.weekDiff}%↑）`}
              <ChevronRight size={13} className="opacity-60" />
            </Button>
          )}
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "160ms", animationFillMode: "both" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">
            累計ダム残高
          </p>
          <p
            className="font-num text-4xl font-semibold leading-none"
            style={{
              color: data
                ? data.cumulativeBalance >= 0
                  ? "var(--kg-success)"
                  : "var(--kg-danger)"
                : "var(--kg-text)",
            }}
          >
            {data ? formatVND(data.cumulativeBalance) : "—"}
          </p>
          {data && (
            <p
              className="mt-2 text-sm font-medium flex items-center gap-1"
              style={{
                color:
                  data.cumulativeBalance >= 0
                    ? "var(--kg-success)"
                    : "var(--kg-danger)",
              }}
            >
              {data.cumulativeBalance >= 0 ? (
                <TrendingDown size={14} />
              ) : (
                <TrendingUp size={14} />
              )}
              {data.cumulativeBalance >= 0 ? "今月は黒字" : "今月は赤字"}
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-4 text-muted-foreground">
            直近7日間の内訳
          </p>
          {data?.categoryBreakdown?.length ? (
            <div className="flex flex-col items-center gap-4">
              <ChartContainer
                config={donutConfig}
                className="aspect-auto h-[220px] w-full"
              >
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    paddingAngle={2}
                    onClick={(entry: { name?: string }, index: number) => {
                      if (entry.name)
                        setPopupCategory({
                          name: entry.name,
                          colorIndex: index,
                        });
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {data.categoryBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => formatVND(value as number)}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
              <div className="w-full space-y-0.5">
                {data.categoryBreakdown.slice(0, 6).map((item, i) => {
                  const prev = data.prevCategoryBreakdown?.[item.name] ?? 0;
                  const diff =
                    prev > 0
                      ? Math.round(((item.value - prev) / prev) * 100)
                      : null;
                  return (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className="flex items-center gap-2 w-full text-left rounded-lg px-2 py-1.5 transition-colors h-auto justify-start"
                      onClick={() =>
                        setPopupCategory({ name: item.name, colorIndex: i })
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="text-sm truncate flex-1 text-muted-foreground">
                        {item.name}
                      </span>
                      <span
                        className="text-xs font-num font-medium"
                        style={{ color: "var(--kg-text)" }}
                      >
                        {formatVND(item.value)}
                      </span>
                      {diff !== null && (
                        <span
                          className="text-xs font-num font-medium w-10 text-right shrink-0"
                          style={{
                            color:
                              diff <= 0
                                ? "var(--kg-success)"
                                : "var(--kg-danger)",
                          }}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}%
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center py-16 text-sm text-muted-foreground">
              直近7日間の取引データがありません
            </p>
          )}
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              支出チェック
            </span>
            <Badge className="gap-1 bg-primary/10 text-primary border-0 px-2 py-0.5">
              <Sparkles size={10} /> AI
            </Badge>
          </div>

          {feedbackLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : feedback ? (
            <div className="space-y-3">
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: "var(--kg-surface-2)" }}
              >
                <p className="text-sm font-medium mb-1.5 text-muted-foreground">
                  今週の状況
                </p>
                <p
                  className="text-sm leading-6"
                  style={{ color: "var(--kg-text-secondary)" }}
                >
                  {feedback.summary}
                </p>
              </div>
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: "var(--kg-surface-2)" }}
              >
                <p
                  className="text-sm font-medium mb-1.5"
                  style={{ color: "var(--kg-accent)" }}
                >
                  注目のポイント
                </p>
                <p
                  className="text-sm leading-6"
                  style={{ color: "var(--kg-text-secondary)" }}
                >
                  {feedback.point}
                </p>
              </div>
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: "var(--kg-surface-2)" }}
              >
                <p className="text-sm font-medium mb-1.5 text-muted-foreground">
                  一言アドバイス
                </p>
                <p
                  className="text-sm leading-6"
                  style={{ color: "var(--kg-text-secondary)" }}
                >
                  {feedback.tip}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              取引データを同期するとチェックが表示されます
            </p>
          )}
        </Card>
      </div>

      <Card className="animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div
          className="px-7 py-5 border-b"
          style={{ borderColor: "var(--kg-border-subtle)" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            直近の取引
          </p>
        </div>
        {data?.recentTransactions?.length ? (
          <div>
            {data.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-7 py-4 border-b last:border-0 transition-colors"
                style={{ borderColor: "var(--kg-border-subtle)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--kg-surface-2)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent")
                }
              >
                <div className="flex items-center gap-3">
                  <CategoryBadge category={tx.category} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--kg-text)" }}
                  >
                    {tx.store}
                  </span>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-num font-semibold"
                    style={{ color: "var(--kg-text)" }}
                  >
                    {formatVND(tx.amount)}
                  </p>
                  <p className="text-xs mt-0.5 text-muted-foreground">
                    {formatDate(tx.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-16 text-muted-foreground">
            取引データがありません。同期ボタンを押してください。
          </p>
        )}
      </Card>

      {popupCategory && (
        <CategoryPopup
          category={popupCategory.name}
          color={DONUT_COLORS[popupCategory.colorIndex % DONUT_COLORS.length]}
          onClose={() => setPopupCategory(null)}
        />
      )}

      {showWeekCompare && data && (
        <WeekComparePopup
          thisWeekTotal={data.thisWeekTotal}
          lastWeekTotal={data.lastWeekTotal}
          weekDiff={data.weekDiff}
          categoryBreakdown={data.categoryBreakdown}
          prevCategoryBreakdown={data.prevCategoryBreakdown}
          onClose={() => setShowWeekCompare(false)}
        />
      )}
    </div>
  );
}
