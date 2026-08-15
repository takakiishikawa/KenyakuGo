"use client";

import { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ChartContainer,
  ChartTooltip,
  cn,
  type ChartConfig,
} from "@takaki/go-design-system";
import type { DisplayCurrency } from "@/components/currency-switch";
import { makeFormatAmount, toDisplayAmount } from "@/lib/currency";

interface TrendCategory {
  id: string;
  name: string;
  is_fixed: boolean;
  budget: number; // VND
}

interface TrendPoint {
  month: string; // 'YYYY-MM'
  totalVnd: number;
  byCategory: TrendCategory[];
}

interface ChartRow {
  label: string;
  month: string;
  value: number; // total, in display currency's numeric units — for the line
  totalVnd: number;
  byCategory: TrendCategory[];
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function BudgetTrendTooltip({
  active,
  payload,
  displayCurrency,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
  displayCurrency: DisplayCurrency;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const formatAmount = makeFormatAmount(displayCurrency);
  const sorted = [...row.byCategory].sort((a, b) => b.budget - a.budget);
  const twoCol = sorted.length > 8;

  return (
    <div
      className={cn(
        "rounded-lg border bg-background px-3 py-2 text-xs shadow-sm",
        twoCol ? "min-w-[24rem]" : "min-w-48",
      )}
      style={{ borderColor: "var(--color-border-default)" }}
    >
      <p className="font-medium mb-1.5" style={{ color: "var(--color-text-primary)" }}>{monthLabel(row.month)}</p>
      {sorted.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>No categories</p>
      ) : (
        <div className={cn("gap-x-5 gap-y-1", twoCol ? "grid grid-cols-2" : "space-y-1")}>
          {sorted.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3">
              <span className="truncate" style={{ color: "var(--color-text-secondary)" }}>{c.name}</span>
              <span className="font-num font-medium shrink-0" style={{ color: "var(--color-text-primary)" }}>
                {formatAmount(c.budget)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--color-border-default)" }}>
        <span style={{ color: "var(--color-text-secondary)" }}>Total</span>
        <span className="font-num font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {formatAmount(row.totalVnd)}
        </span>
      </div>
    </div>
  );
}

export function BudgetTrendDialog({
  open,
  onOpenChange,
  displayCurrency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayCurrency: DisplayCurrency;
}) {
  const [points, setPoints] = useState<TrendPoint[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setPoints(null);
    fetch("/api/categories/budget-trend?months=6")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPoints((data?.months as TrendPoint[]) ?? []))
      .catch(() => setPoints([]));
  }, [open]);

  const chartData: ChartRow[] = (points ?? []).map((p) => ({
    label: monthLabel(p.month),
    month: p.month,
    value: toDisplayAmount(p.totalVnd, displayCurrency),
    totalVnd: p.totalVnd,
    byCategory: p.byCategory,
  }));

  const chartConfig = useMemo<ChartConfig>(
    () => ({ value: { label: "Total", color: "var(--color-primary)" } }),
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-7 py-5 border-b" style={{ borderColor: "var(--color-border-default)" }}>
          <DialogTitle>Budget Trend</DialogTitle>
          <DialogDescription>
            Next {points?.length ?? 6} months, including any scheduled changes. Hover a point for the
            per-category breakdown.
          </DialogDescription>
        </DialogHeader>

        <div className="p-7 overflow-y-auto">
          {points === null ? (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Loading...
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              No data
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[360px] w-full">
              <LineChart data={chartData}>
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
                  cursor={{ stroke: "var(--color-border-default)" }}
                  content={<BudgetTrendTooltip displayCurrency={displayCurrency} />}
                />
                <Line
                  dataKey="value"
                  type="monotone"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--color-primary)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
