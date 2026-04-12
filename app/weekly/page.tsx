"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatVND } from "@/lib/format";

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
  showYearTab: boolean;
}

type Period = "week" | "month" | "year";

function getPeriodKey(p: Period): string {
  const now = new Date();
  if (p === "week") {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return `week-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (p === "month") {
    return `month-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  } else {
    return `year-${now.getFullYear()}`;
  }
}

const PERIOD_LABELS: Record<Period, { current: string; prev: string }> = {
  week:  { current: "今週", prev: "先週" },
  month: { current: "今月", prev: "先月" },
  year:  { current: "今年", prev: "昨年" },
};

const LINE_COLORS = ["#1B4332", "#52B788", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<ReportData | null>(null);
  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    setData(null);
    setComment("");
    const res = await fetch(`/api/weekly?period=${p}`);
    if (!res.ok) return;
    const json: ReportData = await res.json();
    setData(json);

    const periods = json.periods;
    if (periods.length >= 2) {
      setCommentLoading(true);
      const current = periods[periods.length - 1];
      const prev = periods[periods.length - 2];
      const commentRes = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: p === "week" ? "weekly" : p === "month" ? "monthly" : "monthly",
          data: { thisWeek: current.byCategory, lastWeek: prev.byCategory },
          periodKey: getPeriodKey(p),
        }),
      });
      const { comment: c } = await commentRes.json();
      setComment(c);
      setCommentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  // recharts 用データ: x軸=期間ラベル、各カテゴリと合計をキーに
  const chartData = data?.periods.map((p) => ({
    label: p.label,
    合計: p.total,
    ...Object.fromEntries(
      (data.topCategories ?? []).map((cat) => [cat, p.byCategory[cat] ?? 0])
    ),
  })) ?? [];

  const diffColor = data && data.diff <= 0 ? "#10B981" : "#EF4444";
  const labels = PERIOD_LABELS[period];

  const tabs: { value: Period; label: string }[] = [
    { value: "week", label: "週" },
    { value: "month", label: "月" },
    ...(data?.showYearTab ? [{ value: "year" as Period, label: "年" }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1A1A2E" }}>
          レポート
        </h1>

        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#E5E7EB" }}>
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className="px-5 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: period === tab.value ? "#1B4332" : "white",
                color: period === tab.value ? "white" : "#6B7280",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              {labels.current}の総支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={{ color: "#1A1A2E" }}>
              {data ? formatVND(data.currentTotal) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              {labels.prev}との差額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" style={{ color: diffColor }}>
              {data ? `${data.diff > 0 ? "+" : ""}${formatVND(data.diff)}` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "#6B7280" }}>
              最多支出カテゴリ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: "#1A1A2E" }}>
              {data?.topCategory ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
            カテゴリ別推移（上位5カテゴリ）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatVND(value as number)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="合計"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                {(data?.topCategories ?? []).map((cat, i) => (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-sm" style={{ color: "#6B7280" }}>
              データがありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Comment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: "#1A1A2E" }}>
            AIコメント
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commentLoading ? (
            <div className="space-y-2">
              <div className="h-4 rounded animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
              <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: "#E5E7EB" }} />
            </div>
          ) : comment ? (
            <p className="text-sm leading-relaxed" style={{ color: "#1A1A2E" }}>
              {comment}
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              取引データを同期するとAIコメントが表示されます
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
