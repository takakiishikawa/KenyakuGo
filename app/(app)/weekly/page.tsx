"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";
import {
  Card,
  PageHeader,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@takaki/go-design-system";

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
  const top5 = Object.entries(row.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm min-w-44">
      <p className="font-medium text-foreground mb-1.5">{row.label}</p>
      <div className="space-y-1">
        {top5.length === 0 ? (
          <p className="text-muted-foreground">データなし</p>
        ) : (
          top5.map(([cat, amt]) => (
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

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<ReportData | null>(null);

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
      <PageHeader title="レポート" />

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
