"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Sparkles } from "lucide-react";
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

const LINE_COLORS = ["#52B788", "#FFB74D", "#C084FC", "#38BDF8", "#F87171"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs space-y-1"
      style={{
        backgroundColor: "#1A2A1E",
        border: "1px solid rgba(82,183,136,0.25)",
        color: "#E8F5E9",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <p className="font-medium mb-2" style={{ color: "#52B788" }}>{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: "#6B8F71" }}>{entry.name}</span>
          <span className="font-num font-medium ml-auto pl-4">{formatVND(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

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
          type: p === "week" ? "weekly" : "monthly",
          data: { thisWeek: current.byCategory, lastWeek: prev.byCategory },
          periodKey: getPeriodKey(p),
        }),
      });
      const { comment: c } = await commentRes.json();
      setComment(c);
      setCommentLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const chartData = data?.periods.map((p) => ({
    label: p.label,
    合計: p.total,
    ...Object.fromEntries(
      (data.topCategories ?? []).map((cat) => [cat, p.byCategory[cat] ?? 0])
    ),
  })) ?? [];

  const diffPositive = data ? data.diff <= 0 : undefined;
  const labels = PERIOD_LABELS[period];

  const tabs: { value: Period; label: string }[] = [
    { value: "week", label: "週" },
    { value: "month", label: "月" },
    ...(data?.showYearTab ? [{ value: "year" as Period, label: "年" }] : []),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-display text-4xl" style={{ color: "#E8F5E9" }}>
          レポート
        </h1>
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(82,183,136,0.2)", backgroundColor: "#111A14" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className="px-6 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: period === tab.value ? "#52B788" : "transparent",
                color: period === tab.value ? "#0A0F0D" : "#6B8F71",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          {
            label: `${labels.current}の総支出`,
            value: data ? formatVND(data.currentTotal) : "—",
            color: "#E8F5E9",
          },
          {
            label: `${labels.prev}との差額`,
            value: data ? `${data.diff > 0 ? "+" : ""}${formatVND(data.diff)}` : "—",
            color: diffPositive === undefined ? "#E8F5E9" : diffPositive ? "#4CAF50" : "#EF5350",
          },
          {
            label: "最多支出カテゴリ",
            value: data?.topCategory ?? "—",
            color: "#52B788",
          },
        ].map((card, i) => (
          <div
            key={card.label}
            className="kg-card p-7 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "#6B8F71" }}>
              {card.label}
            </p>
            <p className="font-num text-3xl font-semibold leading-none" style={{ color: card.color }}>
              {card.value}
            </p>
            <div className="mt-5 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, #52B788, transparent)" }} />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="kg-card-static p-7 mb-5 animate-fade-up" style={{ animationDelay: "220ms" }}>
        <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "#6B8F71" }}>
          カテゴリ別推移（上位5カテゴリ）
        </p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(82,183,136,0.08)" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6B8F71" }}
                axisLine={{ stroke: "rgba(82,183,136,0.15)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "#6B8F71" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#6B8F71", paddingTop: 16 }}
              />
              <Line
                type="monotone"
                dataKey="合計"
                stroke="rgba(82,183,136,0.4)"
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
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm" style={{ color: "#6B8F71" }}>データがありません</p>
          </div>
        )}
      </div>

      {/* AI Comment */}
      <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#6B8F71" }}>
            AIコメント
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(82,183,136,0.15)", color: "#52B788" }}
          >
            <Sparkles size={10} />
            AI
          </span>
        </div>
        <div className="border-l-2 pl-4" style={{ borderColor: "#52B788" }}>
          {commentLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ) : comment ? (
            <p className="text-sm leading-7 italic" style={{ color: "#B2CABA" }}>{comment}</p>
          ) : (
            <p className="text-sm" style={{ color: "#6B8F71" }}>取引データを同期するとコメントが表示されます</p>
          )}
        </div>
      </div>
    </div>
  );
}
