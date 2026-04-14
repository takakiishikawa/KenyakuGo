"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";

interface PeriodItem { label: string; total: number; byCategory: Record<string, number>; }
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
    const d = new Date(now); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return `v2-week-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  } else if (p === "month") return `v2-month-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  return `v2-year-${now.getFullYear()}`;
}

const LABELS: Record<Period, {current:string;prev:string}> = {
  week: {current:"今週",prev:"先週"}, month: {current:"今月",prev:"先月"}, year: {current:"今年",prev:"昨年"},
};
const LINE_COLORS = ["#52B788","#FFB74D","#C084FC","#38BDF8","#F87171"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm space-y-1"
      style={{ backgroundColor: "var(--kg-surface-2)", border: "1px solid var(--kg-border-medium)", color: "var(--kg-text)", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
      <p className="font-medium mb-2" style={{ color: "var(--kg-accent)" }}>{label}</p>
      {payload.map((e: {name:string;value:number;color:string}) => (
        <div key={e.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span style={{ color: "var(--kg-text-muted)" }}>{e.name}</span>
          <span className="font-num font-medium ml-auto pl-4">{formatVND(e.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<ReportData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    setData(null); setFeedback(null);
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
        method: "POST", headers: {"Content-Type":"application/json"},
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

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const chartData = data?.periods.map((p) => ({
    label: p.label, 合計: p.total,
    ...Object.fromEntries((data.topCategories ?? []).map((cat) => [cat, p.byCategory[cat] ?? 0])),
  })) ?? [];

  const labels = LABELS[period];
  const tabs: { value: Period; label: string }[] = [
    { value: "week", label: "今週" },
    { value: "month", label: "今月" },
    { value: "year", label: "年" },
  ];

  // カード共通計算
  const projected = data?.projectedTotal ?? null;
  const projectedDiff = data?.projectedDiff ?? null;
  const target = data?.targetMonthly ?? 0;
  const prevPeriodTotal = data?.prevPeriodTotal ?? 0;

  // Card2: 予測ベースの差額
  const card2Diff = projectedDiff ?? data?.diff ?? 0;
  const card2Pct = prevPeriodTotal > 0 ? Math.round((card2Diff / prevPeriodTotal) * 100) : null;
  const card2Improved = card2Diff <= 0;

  // 月のみ: 月末予測 vs 目標
  const projVsTarget = period === "month" && projected != null && target > 0
    ? projected > target
      ? { text: `目標 ${formatVND(target)} を超過見込み`, ok: false }
      : { text: `目標 ${formatVND(target)} 内で推移中`, ok: true }
    : null;

  const card3SavingsCategory = feedback?.savingsCategory;

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--kg-text)" }}>レポート</h1>
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--kg-border)", backgroundColor: "var(--kg-surface)" }}>
          {tabs.map((tab) => (
            <button key={tab.value} onClick={() => setPeriod(tab.value)} className="px-6 py-2 text-sm font-medium transition-all"
              style={{ backgroundColor: period === tab.value ? "var(--kg-accent)" : "transparent", color: period === tab.value ? "var(--kg-bg)" : "var(--kg-text-muted)" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* カード1: 当期出費 + 月のみ予測・目標 */}
        <div className="kg-card p-7 animate-fade-up" style={{ animationDelay: "0ms", animationFillMode: "both" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>{labels.current}の出費</p>
          <p className="font-num text-3xl font-semibold leading-none" style={{ color: "var(--kg-text)" }}>
            {data ? formatVND(data.currentTotal) : "—"}
          </p>
          {period === "month" && projected != null && (
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--kg-text-muted)" }}>
              月末予測{" "}
              <span className="font-num" style={{ color: projVsTarget ? (projVsTarget.ok ? "var(--kg-success)" : "var(--kg-danger)") : "var(--kg-text)" }}>
                {formatVND(projected)}
              </span>
            </p>
          )}
          {projVsTarget && (
            <p className="mt-1 text-xs flex items-center gap-1"
              style={{ color: projVsTarget.ok ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {projVsTarget.ok ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {projVsTarget.text}
            </p>
          )}
          <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
        </div>

        {/* カード2: 予測ベースの前期差額（全期間共通） */}
        <div className="kg-card p-7 animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>{labels.prev}との差額</p>
          <p className="font-num text-3xl font-semibold leading-none"
            style={{ color: data == null ? "var(--kg-text)" : card2Improved ? "var(--kg-success)" : "var(--kg-danger)" }}>
            {data ? `${card2Diff > 0 ? "+" : ""}${formatVND(card2Diff)}` : "—"}
          </p>
          {data && card2Pct !== null && (
            <p className="mt-2 text-sm font-medium flex items-center gap-1"
              style={{ color: card2Improved ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {card2Improved ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {card2Improved
                ? `${labels.prev}より倹約見込み（${Math.abs(card2Pct)}%↓）`
                : `${labels.prev}より増加見込み（${card2Pct}%↑）`}
            </p>
          )}
          {projected != null && (
            <p className="text-xs mt-1" style={{ color: "var(--kg-text-muted)", opacity: 0.7 }}>
              {period === "week" ? "今週" : period === "month" ? "今月" : "今年"}の予測: {formatVND(projected)}
            </p>
          )}
          <div className="mt-3 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
        </div>

        {/* カード3: 気になる支出（AI） */}
        <div className="kg-card p-7 animate-fade-up" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>気になる支出</p>
          {feedbackLoading ? (
            <div className="skeleton h-8 w-3/4 rounded-lg" />
          ) : (
            <p className="font-num text-3xl font-semibold leading-none" style={{ color: card3SavingsCategory ? "var(--kg-warning)" : "var(--kg-accent)" }}>
              {card3SavingsCategory ?? data?.topCategory ?? "—"}
            </p>
          )}
          <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
        </div>
      </div>

      <div className="kg-card-static p-7 mb-5">
        <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "var(--kg-text-muted)" }}>
          使い道の推移（上位5カテゴリ）
        </p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--kg-border-subtle)" strokeDasharray="0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 13, fill: "var(--kg-text-muted)" }} axisLine={{ stroke: "var(--kg-border)" }} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 13, fill: "var(--kg-text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 13, color: "var(--kg-text-muted)", paddingTop: 16 }} />
              <Line type="monotone" dataKey="合計" stroke="var(--kg-border-medium)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              {(data?.topCategories ?? []).map((cat, i) => (
                <Line key={cat} type="monotone" dataKey={cat} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2}
                  dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length] }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>データがありません</p>
          </div>
        )}
      </div>

      {/* 支出の振り返り */}
      <div className="kg-card-static p-7">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>支出の振り返り</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
            <Sparkles size={10} /> AI
          </span>
        </div>

        {feedbackLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-16 w-full rounded-xl" />
            <div className="skeleton h-20 w-full rounded-xl" />
            <div className="skeleton h-24 w-full rounded-xl" />
          </div>
        ) : feedback ? (
          <div className="space-y-3">
            {/* 全体のまとめ */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--kg-surface-2)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--kg-text-muted)" }}>まとめ</p>
              <p className="text-sm leading-6" style={{ color: "var(--kg-text-secondary)" }}>{feedback.analysis}</p>
            </div>

            {/* 気になる支出 */}
            {feedback.savingsCategory && (
              <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,183,77,0.07)", border: "1px solid rgba(255,183,77,0.15)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--kg-warning)" }}>少し使いすぎかも</p>
                <p className="text-base font-semibold mb-1" style={{ color: "var(--kg-warning)" }}>{feedback.savingsCategory}</p>
                <p className="text-sm leading-6" style={{ color: "var(--kg-text-secondary)" }}>{feedback.savingsReason}</p>
              </div>
            )}

            {/* ヒント */}
            {feedback.savingsSuggestion && (
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--kg-surface-2)" }}>
                <p className="text-xs font-medium mb-3" style={{ color: "var(--kg-text-muted)" }}>こうしてみては？</p>
                <div className="space-y-2.5">
                  {feedback.savingsSuggestion
                    .split("\n")
                    .map((line) => line.replace(/^[・•\-\s]+/, "").trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: "rgba(82,183,136,0.15)", color: "var(--kg-accent)" }}>
                          {i + 1}
                        </span>
                        <p className="text-sm leading-6 flex-1" style={{ color: "var(--kg-text-secondary)" }}>{line}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>取引データを同期すると振り返りが表示されます</p>
        )}
      </div>
    </div>
  );
}
