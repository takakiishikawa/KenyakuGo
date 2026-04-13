"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { RefreshCw, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatVND, formatDate } from "@/lib/format";
import { getCategoryColors } from "@/lib/category-colors";

const DONUT_COLORS = ["#2D6A4F", "#52B788", "#95D5B2", "#FFB74D", "#C084FC", "#38BDF8", "#F87171"];

interface DashboardData {
  thisMonthTotal: number;
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekDiff: number;
  damBalance: number;
  targetMonthly: number;
  categoryBreakdown: { name: string; value: number }[];
  recentTransactions: {
    id: string;
    store: string;
    amount: number;
    category: string;
    date: string;
  }[];
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
      if (current >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(current));
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
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: isUncategorized ? "rgba(239,83,80,0.12)" : bg,
        color: isUncategorized ? "var(--kg-danger)" : text,
        border: `1px solid ${isUncategorized ? "rgba(239,83,80,0.25)" : "transparent"}`,
      }}
    >
      {isUncategorized ? "未分類" : category}
    </span>
  );
}

function SummaryCard({
  label, value, sub, positive, delay = 0,
}: {
  label: string; value: string; sub?: string; positive?: boolean; delay?: number;
}) {
  return (
    <div className="kg-card p-7 animate-fade-up" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>
        {label}
      </p>
      <p className="font-num text-4xl font-semibold leading-none" style={{ color: "var(--kg-text)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-2 text-sm font-medium flex items-center gap-1"
          style={{ color: positive === undefined ? "var(--kg-text-muted)" : positive ? "var(--kg-success)" : "var(--kg-danger)" }}>
          {positive !== undefined && (positive ? <TrendingDown size={14} /> : <TrendingUp size={14} />)}
          {sub}
        </p>
      )}
      <div className="mt-5 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [comment, setComment] = useState<string>("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const monthTotal = useCountUp(data?.thisMonthTotal ?? null);
  const damBalance = useCountUp(data?.damBalance ?? null);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    if (!res.ok) return;
    setData(json);
    if (json.categoryBreakdown?.length > 0) {
      setCommentLoading(true);
      const commentRes = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dashboard",
          data: Object.fromEntries(
            json.categoryBreakdown.map((c: { name: string; value: number }) => [c.name, c.value])
          ),
        }),
      });
      const { comment: c } = await commentRes.json();
      setComment(c);
      setCommentLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSync = async () => {
    setSyncing(true);
    let totalSynced = 0;
    try {
      while (true) {
        const res = await fetch("/api/gmail/sync");
        let json: { synced?: number; remaining?: number; error?: string } = {};
        try { json = await res.json(); } catch {
          toast.error("同期失敗: サーバーエラー（タイムアウトの可能性があります）");
          break;
        }
        if (!res.ok) { toast.error(`同期失敗: ${json.error ?? res.status}`); break; }
        totalSynced += json.synced ?? 0;
        if ((json.remaining ?? 0) > 0) {
          toast.info(`${totalSynced}件取得済み、残り${json.remaining}件を同期中...`);
          continue;
        }
        toast.success(`${totalSynced}件取得しました`);
        break;
      }
      fetchDashboard();
    } catch (e) {
      toast.error(`同期失敗: ${e instanceof Error ? e.message : "network error"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--kg-text)" }}>ダッシュボード</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--kg-surface-2)", color: "var(--kg-accent)", border: "1px solid var(--kg-border-medium)" }}
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "同期中..." : "同期"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <SummaryCard label="今月の総支出" value={data ? formatVND(monthTotal) : "—"} delay={0} />
        <SummaryCard
          label="先週比"
          value={data ? `${data.weekDiff > 0 ? "+" : ""}${data.weekDiff}%` : "—"}
          sub={data ? (data.weekDiff <= 0 ? "先週より節約" : "先週より増加") : undefined}
          positive={data ? data.weekDiff <= 0 : undefined}
          delay={80}
        />
        <SummaryCard
          label="ダム残高"
          value={data ? formatVND(damBalance) : "—"}
          sub={data && data.damBalance >= 0 ? "黒字" : data ? "赤字" : undefined}
          positive={data ? data.damBalance >= 0 : undefined}
          delay={160}
        />
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        {/* Donut */}
        <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "var(--kg-text-muted)" }}>
            今週のカテゴリ別支出
          </p>
          {data?.categoryBreakdown?.length ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categoryBreakdown} cx="50%" cy="50%" innerRadius={52} outerRadius={85} dataKey="value" paddingAngle={2}>
                      {data.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--kg-surface-2)", border: "1px solid var(--kg-border-medium)", borderRadius: 10, color: "var(--kg-text)", fontSize: 13 }}
                      formatter={(v) => [formatVND(v as number), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {data.categoryBreakdown.slice(0, 6).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-xs truncate flex-1" style={{ color: "var(--kg-text-muted)" }}>{item.name}</span>
                    <span className="text-xs font-num font-medium" style={{ color: "var(--kg-text)" }}>{formatVND(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-16 text-sm" style={{ color: "var(--kg-text-muted)" }}>今週の取引データがありません</p>
          )}
        </div>

        {/* AI Comment */}
        <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>AIコメント</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
              <Sparkles size={10} /> AI
            </span>
          </div>
          <div className="border-l-2 pl-4" style={{ borderColor: "var(--kg-accent)" }}>
            {commentLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-4/5" /><div className="skeleton h-4 w-3/5" />
              </div>
            ) : comment ? (
              <p className="text-sm leading-7 italic" style={{ color: "var(--kg-text-secondary)" }}>{comment}</p>
            ) : (
              <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>取引データを同期するとコメントが表示されます</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="kg-card-static animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="px-7 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>直近の取引</p>
        </div>
        {data?.recentTransactions?.length ? (
          <div>
            {data.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-7 py-4 border-b last:border-0 transition-colors"
                style={{ borderColor: "var(--kg-border-subtle)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--kg-surface-2)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
              >
                <div className="flex items-center gap-3">
                  <CategoryBadge category={tx.category} />
                  <span className="text-sm font-medium" style={{ color: "var(--kg-text)" }}>{tx.store}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-num font-semibold" style={{ color: "var(--kg-text)" }}>{formatVND(tx.amount)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kg-text-muted)" }}>{formatDate(tx.date)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-16" style={{ color: "var(--kg-text-muted)" }}>
            取引データがありません。同期ボタンを押してください。
          </p>
        )}
      </div>
    </div>
  );
}
