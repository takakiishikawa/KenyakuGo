"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
const LineChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.LineChart })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-40 bg-muted rounded" />,
  },
);
const Line = dynamic(
  () => import("recharts").then((m) => ({ default: m.Line })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import("recharts").then((m) => ({ default: m.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import("recharts").then((m) => ({ default: m.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => ({ default: m.CartesianGrid })),
  { ssr: false },
);
const Legend = dynamic(
  () => import("recharts").then((m) => ({ default: m.Legend })),
  { ssr: false },
);
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";
import {
  Badge,
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
interface FeedbackData {
  analysis: string;
  savingsCategory: string | null;
  savingsReason: string;
  savingsSuggestion: string;
}
type Period = "week" | "month" | "year";

function getPeriodKey(p: Period): string {
  const now = new Date();
  if (p === "week") {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return `v2-week-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (p === "month")
    return `v2-month-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `v2-year-${now.getFullYear()}`;
}

const LABELS: Record<Period, { current: string; prev: string }> = {
  week: { current: "今週", prev: "先週" },
  month: { current: "今月", prev: "先月" },
  year: { current: "今年", prev: "昨年" },
};
const LINE_COLORS = ["#52B788", "#FFB74D", "#C084FC", "#38BDF8", "#F87171"];

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<ReportData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    setData(null);
    setFeedback(null);
    const res = await fetch(`/api/weekly?period=${p}`);
    if (!res.ok) return;
    const json: ReportData = await res.json();
    setData(json);
    const periods = json.periods;
    if (periods.length >= 2) {
      setFeedbackLoading(true);
      const current = periods[periods.length - 1];
      const prev = periods[periods.length - 2];
      const r = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: p === "week" ? "weekly" : "monthly",
          data: { thisWeek: current.byCategory, lastWeek: prev.byCategory },
          periodKey: getPeriodKey(p),
        }),
      });
      const result = await r.json();
      if (result.feedback) setFeedback(result.feedback as FeedbackData);
      setFeedbackLoading(false);
    }
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

  const card3SavingsCategory = feedback?.savingsCategory;

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
          {feedbackLoading ? (
            <Skeleton className="h-8 w-3/4 rounded-lg" />
          ) : (
            <p
              className="font-num text-3xl font-semibold leading-none"
              style={{
                color: card3SavingsCategory
                  ? "var(--kg-warning)"
                  : "var(--kg-accent)",
              }}
            >
              {card3SavingsCategory ?? data?.topCategory ?? "—"}
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

      <Card className="p-7">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            支出の振り返り
          </span>
          <Badge className="gap-1 bg-primary/10 text-primary border-0 px-2 py-0.5">
            <Sparkles size={10} /> AI
          </Badge>
        </div>

        {feedbackLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : feedback ? (
          <div className="space-y-3">
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--kg-surface-2)" }}
            >
              <p className="text-sm font-medium mb-2 text-muted-foreground">
                まとめ
              </p>
              <p
                className="text-sm leading-6"
                style={{ color: "var(--kg-text-secondary)" }}
              >
                {feedback.analysis}
              </p>
            </div>

            {feedback.savingsCategory && (
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: "var(--color-warning-subtle)",
                  border: "1px solid var(--color-warning-muted)",
                }}
              >
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: "var(--kg-warning)" }}
                >
                  少し使いすぎかも
                </p>
                <p
                  className="text-base font-semibold mb-1"
                  style={{ color: "var(--kg-warning)" }}
                >
                  {feedback.savingsCategory}
                </p>
                <p
                  className="text-sm leading-6"
                  style={{ color: "var(--kg-text-secondary)" }}
                >
                  {feedback.savingsReason}
                </p>
              </div>
            )}

            {feedback.savingsSuggestion && (
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: "var(--kg-surface-2)" }}
              >
                <p className="text-sm font-medium mb-3 text-muted-foreground">
                  こうしてみては？
                </p>
                <div className="space-y-2.5">
                  {feedback.savingsSuggestion
                    .split("\n")
                    .map((line) => line.replace(/^[・•\-\s]+/, "").trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{
                            backgroundColor: "var(--color-success-subtle)",
                            color: "var(--kg-accent)",
                          }}
                        >
                          {i + 1}
                        </span>
                        <p
                          className="text-sm leading-6 flex-1"
                          style={{ color: "var(--kg-text-secondary)" }}
                        >
                          {line}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            取引データを同期すると振り返りが表示されます
          </p>
        )}
      </Card>
    </div>
  );
}
