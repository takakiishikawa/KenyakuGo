"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
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
  ChartTooltipContent,
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
const LINE_COLORS = ["#52B788", "#FFB74D", "#C084FC", "#38BDF8", "#F87171"];

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

  const chartData =
    data?.periods.map((p) => ({
      label: p.label,
      合計: p.total,
      ...Object.fromEntries(
        (data.topCategories ?? []).map((cat) => [cat, p.byCategory[cat] ?? 0]),
      ),
    })) ?? [];

  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {
      合計: { label: "合計", color: "var(--color-border-strong)" },
    };
    (data?.topCategories ?? []).forEach((cat, i) => {
      cfg[cat] = { label: cat, color: LINE_COLORS[i % LINE_COLORS.length] };
    });
    return cfg;
  }, [data?.topCategories]);

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
          使い道の推移（上位5カテゴリ）
        </p>
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
          >
            <LineChart data={chartData}>
              <CartesianGrid
                stroke="var(--color-border-subtle)"
                strokeDasharray="0"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 13, fill: "var(--color-text-subtle)" }}
                axisLine={{ stroke: "var(--color-border-default)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 13, fill: "var(--color-text-subtle)" }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatVND(value as number)}
                  />
                }
              />
              <Legend
                wrapperStyle={{
                  fontSize: 13,
                  color: "var(--color-text-subtle)",
                  paddingTop: 16,
                }}
              />
              <Line
                type="monotone"
                dataKey="合計"
                stroke="var(--color-border-strong)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
              {(data?.topCategories ?? []).map((cat, i) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
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
