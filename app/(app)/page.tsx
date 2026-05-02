"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { TrendingDown, TrendingUp, ChevronRight } from "lucide-react";
import { toast } from "@takaki/go-design-system";
import { formatVND, formatDate } from "@/lib/format";
import { getCategoryColors } from "@/lib/category-colors";
import {
  Button,
  Card,
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
  "#FBBF24",
  "#A78BFA",
  "#34D399",
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
  if (category === "その他") return <Tag color="danger">未分類</Tag>;
  const { bg, border, text } = getCategoryColors(category);
  return (
    <Tag style={{ backgroundColor: bg, borderColor: border, color: text }}>
      {category}
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
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b pr-14">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              先週との比較
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

        <div className="grid grid-cols-2 border-b text-center">
          <div className="px-6 py-4 border-r">
            <p className="text-sm text-muted-foreground mb-1">今週</p>
            <p className="font-num text-lg font-semibold text-foreground">
              {formatVND(thisWeekTotal)}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground mb-1">先週</p>
            <p className="font-num text-lg font-semibold text-muted-foreground">
              {formatVND(lastWeekTotal)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-6 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>カテゴリ</span>
          <span className="text-right w-24">先週</span>
          <span className="text-right w-24">今週</span>
          <span className="text-right w-12">変化</span>
        </div>

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
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const projected = data?.projectedMonthTotal ?? null;
  const target = data?.targetMonthly ?? 0;
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
      <PageHeader title="ダッシュボード" />

      <div className="mt-8 grid grid-cols-3 gap-5 mb-8">
        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">
            今月の出費
          </p>
          <p className="font-num text-4xl font-semibold leading-none text-foreground">
            {data ? formatVND(monthTotal) : "—"}
          </p>
          {projected != null && (
            <p className="mt-3 text-sm text-muted-foreground">
              月予測{" "}
              <span className="font-num">{formatVND(projected)}</span>
              {target > 0 && <span> / {formatVND(target)}</span>}
            </p>
          )}
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">
            直近7日の出費
          </p>
          <p className="font-num text-4xl font-semibold leading-none text-foreground">
            {data ? formatVND(data.thisWeekTotal) : "—"}
          </p>
          {data && data.lastWeekTotal > 0 && (
            <Button
              variant="ghost"
              className="mt-3 flex items-center gap-1 text-sm font-medium rounded-lg transition-opacity hover:opacity-70 h-auto p-0"
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
              先週比 {data.weekDiff > 0 ? "+" : ""}
              {data.weekDiff}%
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
          <p className="font-num text-4xl font-semibold leading-none text-foreground">
            {data ? formatVND(data.cumulativeBalance) : "—"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-4 text-muted-foreground">
            直近7日の内訳
          </p>
          {data?.categoryBreakdown?.length ? (
            <ChartContainer
              config={donutConfig}
              className="aspect-auto h-[320px] w-full"
            >
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={105}
                  dataKey="value"
                  paddingAngle={2}
                  labelLine={{
                    stroke: "var(--color-border-strong)",
                    strokeWidth: 1,
                  }}
                  label={(props) => {
                    const cx = Number(props.cx ?? 0);
                    const cy = Number(props.cy ?? 0);
                    const midAngle = Number(props.midAngle ?? 0);
                    const outerRadius = Number(props.outerRadius ?? 0);
                    const percent = Number(props.percent ?? 0);
                    const name = String(props.name ?? "");
                    if (percent < 0.03)
                      return null as unknown as React.ReactElement;
                    const RADIAN = Math.PI / 180;
                    const r = outerRadius + 18;
                    const x = cx + r * Math.cos(-midAngle * RADIAN);
                    const y = cy + r * Math.sin(-midAngle * RADIAN);
                    const anchor = x > cx ? "start" : "end";
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor={anchor}
                        dominantBaseline="central"
                        fontSize={12}
                        fill="var(--color-text-secondary)"
                      >
                        <tspan x={x} dy="-0.4em" fontWeight={500}>
                          {name}
                        </tspan>
                        <tspan
                          x={x}
                          dy="1.2em"
                          fill="var(--color-text-subtle)"
                        >
                          {(percent * 100).toFixed(0)}%
                        </tspan>
                      </text>
                    );
                  }}
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
          ) : (
            <p className="text-center py-16 text-sm text-muted-foreground">
              直近7日間の取引データがありません
            </p>
          )}
        </Card>

        <Card
          className="animate-fade-up flex flex-col"
          style={{ animationDelay: "300ms" }}
        >
          <div
            className="px-7 py-5 border-b"
            style={{ borderColor: "var(--kg-border-subtle)" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              直近の取引（3日間）
            </p>
          </div>
          {data?.recentTransactions?.length ? (
            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
              {data.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-7 py-4 border-b last:border-0 transition-colors hover:bg-muted/30"
                  style={{ borderColor: "var(--kg-border-subtle)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryBadge category={tx.category} />
                    <span className="text-sm font-medium truncate text-foreground">
                      {tx.store}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-num font-semibold text-foreground">
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
              直近3日間の取引データがありません。
            </p>
          )}
        </Card>
      </div>

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
