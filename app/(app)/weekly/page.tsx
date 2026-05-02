"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp, History } from "lucide-react";
import { formatVND } from "@/lib/format";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Tag,
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@takaki/go-design-system";
import type { MonthRecord } from "@/app/api/dam/route";

interface PeriodItem {
  label: string;
  total: number;
  byCategory: Record<string, number>;
}
interface ReportData {
  periods: PeriodItem[];
  topCategories: string[];
  diff: number;
  topCategory: string;
  currentTotal: number;
  prevPeriodTotal: number;
  projectedTotal: number | null;
  projectedDiff: number | null;
  targetMonthly: number;
  fixedCosts: number;
  showYearTab: boolean;
}
type Period = "week" | "month" | "year";

const LABELS: Record<Period, { current: string; prev: string }> = {
  week: { current: "今週", prev: "先週" },
  month: { current: "今月", prev: "先月" },
  year: { current: "今年", prev: "昨年" },
};

interface ChartRow {
  label: string;
  total: number;
  byCategory: Record<string, number>;
}

function ChartTooltipContentTop5({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const top10 = Object.entries(row.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm min-w-44">
      <p className="font-medium text-foreground mb-1.5">{row.label}</p>
      <div className="space-y-1">
        {top10.length === 0 ? (
          <p className="text-muted-foreground">データなし</p>
        ) : (
          top10.map(([cat, amt]) => (
            <div
              key={cat}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-muted-foreground truncate">{cat}</span>
              <span className="font-num font-medium text-foreground shrink-0">
                {formatVND(amt)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3">
        <span className="text-muted-foreground">合計</span>
        <span className="font-num font-semibold text-foreground">
          {formatVND(row.total)}
        </span>
      </div>
    </div>
  );
}

function SavingsHistoryTable({ months }: { months: MonthRecord[] }) {
  const currentMonth = months[months.length - 1];
  const totals = months.reduce(
    (acc, m) => ({
      target: acc.target + m.target,
      projected: acc.projected + m.projected,
      balance: acc.balance + m.balance,
    }),
    { target: 0, projected: 0, balance: 0 },
  );
  const totalCumulative = currentMonth?.cumulative ?? 0;

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="px-7 text-xs uppercase tracking-wider">
            月
          </TableHead>
          <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
            予算
          </TableHead>
          <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
            支出
          </TableHead>
          <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
            倹約額
          </TableHead>
          <TableHead className="px-7 text-right text-xs uppercase tracking-wider">
            累計
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40 border-b-2 border-border">
          <TableCell className="px-7 py-4 text-sm text-foreground">
            合計
          </TableCell>
          <TableCell className="px-7 py-4 text-sm font-num text-right text-muted-foreground">
            {formatVND(totals.target)}
          </TableCell>
          <TableCell className="px-7 py-4 text-sm font-num text-right text-foreground">
            {formatVND(totals.projected)}
          </TableCell>
          <TableCell
            className="px-7 py-4 text-sm font-num text-right"
            style={{
              color:
                totals.balance >= 0
                  ? "var(--color-success)"
                  : "var(--color-danger)",
            }}
          >
            <span className="inline-flex items-center justify-end gap-1">
              {totals.balance >= 0 ? (
                <TrendingDown size={11} />
              ) : (
                <TrendingUp size={11} />
              )}
              {totals.balance > 0 ? "+" : ""}
              {formatVND(totals.balance)}
            </span>
          </TableCell>
          <TableCell
            className="px-7 py-4 text-sm font-num text-right"
            style={{
              color:
                totalCumulative >= 0
                  ? "var(--color-success)"
                  : "var(--color-danger)",
            }}
          >
            {totalCumulative > 0 ? "+" : ""}
            {formatVND(totalCumulative)}
          </TableCell>
        </TableRow>

        {[...months].reverse().map((m) => {
          const isCurrent = currentMonth?.key === m.key;
          const monthSaved = m.balance >= 0;
          return (
            <TableRow
              key={m.key}
              className={
                isCurrent ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : ""
              }
            >
              <TableCell className="px-7 py-4">
                <span className="inline-flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isCurrent ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {m.label}
                  </span>
                  {isCurrent && (
                    <Tag color="info" className="text-[10px] px-1.5 py-0">
                      予測
                    </Tag>
                  )}
                </span>
              </TableCell>
              <TableCell className="px-7 py-4 text-sm font-num text-right text-muted-foreground">
                {formatVND(m.target)}
              </TableCell>
              <TableCell className="px-7 py-4 text-sm font-num text-right text-foreground">
                {formatVND(m.projected)}
              </TableCell>
              <TableCell
                className="px-7 py-4 text-sm font-num font-semibold text-right"
                style={{
                  color: monthSaved
                    ? "var(--color-success)"
                    : "var(--color-danger)",
                }}
              >
                <span className="inline-flex items-center justify-end gap-1">
                  {monthSaved ? (
                    <TrendingDown size={11} />
                  ) : (
                    <TrendingUp size={11} />
                  )}
                  {m.balance > 0 ? "+" : ""}
                  {formatVND(m.balance)}
                </span>
              </TableCell>
              <TableCell
                className="px-7 py-4 text-sm font-num font-semibold text-right"
                style={{
                  color:
                    m.cumulative >= 0
                      ? "var(--color-success)"
                      : "var(--color-danger)",
                }}
              >
                {m.cumulative > 0 ? "+" : ""}
                {formatVND(m.cumulative)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<ReportData | null>(null);
  const [history, setHistory] = useState<MonthRecord[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    setData(null);
    const res = await fetch(`/api/weekly?period=${p}`);
    if (!res.ok) return;
    const json: ReportData = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  // 履歴は初回 Dialog を開いた時にだけ取得
  useEffect(() => {
    if (!historyOpen || history !== null) return;
    fetch("/api/dam")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { months: MonthRecord[] } | null) => {
        if (json) setHistory(json.months);
      });
  }, [historyOpen, history]);

  const chartData: ChartRow[] =
    data?.periods.map((p) => ({
      label: p.label,
      total: p.total,
      byCategory: p.byCategory ?? {},
    })) ?? [];

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      total: { label: "合計", color: "var(--color-primary)" },
    }),
    [],
  );

  const labels = LABELS[period];

  const projected = data?.projectedTotal ?? null;
  const projectedDiff = data?.projectedDiff ?? null;
  const target = data?.targetMonthly ?? 0;
  const prevPeriodTotal = data?.prevPeriodTotal ?? 0;

  const card2Diff = projectedDiff ?? data?.diff ?? 0;
  const card2Pct =
    prevPeriodTotal > 0
      ? Math.round((card2Diff / prevPeriodTotal) * 100)
      : null;
  const card2Improved = card2Diff <= 0;

  const projVsTarget =
    period === "month" && projected != null && target > 0
      ? projected > target
        ? { text: `目標 ${formatVND(target)} を超過見込み`, ok: false }
        : { text: `目標 ${formatVND(target)} 内で推移中`, ok: true }
      : null;

  return (
    <div>
      <PageHeader
        title="レポート"
        actions={
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History size={14} />
                月別倹約履歴
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="px-7 py-5 border-b">
                <DialogTitle>月別倹約履歴</DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto">
                {history === null ? (
                  <div className="p-7 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-10 rounded" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-center py-16 text-sm text-muted-foreground">
                    履歴データがありません
                  </p>
                ) : (
                  <SavingsHistoryTable months={history} />
                )}
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mt-6 mb-8">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="week">今週</TabsTrigger>
            <TabsTrigger value="month">今月</TabsTrigger>
            <TabsTrigger value="year">年</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">
            {labels.current}の出費
          </p>
          <p
            className="font-num text-3xl font-semibold leading-none"
            style={{ color: "var(--kg-text)" }}
          >
            {data ? formatVND(data.currentTotal) : "—"}
          </p>
          {period === "month" && projected != null && (
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
            {labels.prev}との差額
          </p>
          <p
            className="font-num text-3xl font-semibold leading-none"
            style={{
              color:
                data == null
                  ? "var(--kg-text)"
                  : card2Improved
                    ? "var(--kg-success)"
                    : "var(--kg-danger)",
            }}
          >
            {data ? `${card2Diff > 0 ? "+" : ""}${formatVND(card2Diff)}` : "—"}
          </p>
          {data && card2Pct !== null && (
            <p
              className="mt-2 text-sm font-medium flex items-center gap-1"
              style={{
                color: card2Improved ? "var(--kg-success)" : "var(--kg-danger)",
              }}
            >
              {card2Improved ? (
                <TrendingDown size={14} />
              ) : (
                <TrendingUp size={14} />
              )}
              {card2Improved
                ? `${labels.prev}より倹約見込み（${Math.abs(card2Pct)}%↓）`
                : `${labels.prev}より増加見込み（${card2Pct}%↑）`}
            </p>
          )}
          {projected != null && (
            <p
              className="text-sm mt-1 text-muted-foreground"
              style={{ opacity: 0.8 }}
            >
              {period === "week"
                ? "今週"
                : period === "month"
                  ? "今月"
                  : "今年"}
              の予測: {formatVND(projected)}
            </p>
          )}
        </Card>

        <Card
          className="p-7 animate-fade-up"
          style={{ animationDelay: "160ms", animationFillMode: "both" }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-muted-foreground">
            気になる支出
          </p>
          {!data ? (
            <Skeleton className="h-8 w-3/4 rounded-lg" />
          ) : (
            <p
              className="font-num text-3xl font-semibold leading-none"
              style={{ color: "var(--kg-accent)" }}
            >
              {data.topCategory ?? "—"}
            </p>
          )}
        </Card>
      </div>

      <Card className="p-7 mb-5">
        <p className="text-xs font-medium uppercase tracking-widest mb-6 text-muted-foreground">
          使い道の推移
        </p>
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="reportTotalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContentTop5 />}
              />
              <Area
                dataKey="total"
                type="natural"
                fill="url(#reportTotalFill)"
                stroke="var(--color-primary)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">データがありません</p>
          </div>
        )}
      </Card>

    </div>
  );
}
