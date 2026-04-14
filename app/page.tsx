"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, Sparkles, X, RefreshCw, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatVND, formatDate } from "@/lib/format";
import { getCategoryColors } from "@/lib/category-colors";

const DONUT_COLORS = ["#2D6A4F", "#52B788", "#95D5B2", "#FFB74D", "#C084FC", "#38BDF8", "#F87171"];

interface DashboardData {
  thisMonthTotal: number;
  projectedMonthTotal: number | null;
  thisWeekTotal: number;
  lastWeekTotal: number;
  weekDiff: number;
  damBalance: number;
  targetMonthly: number;
  categoryBreakdown: { name: string; value: number }[];
  prevCategoryBreakdown: Record<string, number>;
  recentTransactions: { id: string; store: string; amount: number; category: string; date: string; }[];
}

interface DashboardFeedback {
  summary: string;
  point: string;
  tip: string;
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
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: isUncategorized ? "rgba(239,83,80,0.12)" : bg,
        color: isUncategorized ? "var(--kg-danger)" : text,
        border: `1px solid ${isUncategorized ? "rgba(239,83,80,0.25)" : "transparent"}`,
      }}>
      {isUncategorized ? "未分類" : category}
    </span>
  );
}

function CategoryPopup({ category, color, onClose }: { category: string; color: string; onClose: () => void }) {
  const [txs, setTxs] = useState<TxItem[] | null>(null);

  useEffect(() => {
    fetch(`/api/transactions?period=last7&category=${encodeURIComponent(category)}`)
      .then((r) => r.json())
      .then((data) => setTxs(data as TxItem[]))
      .catch(() => { toast.error("データ取得に失敗しました"); onClose(); });
  }, [category, onClose]);

  const total = txs ? txs.reduce((s, t) => s + t.amount, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-up"
        style={{ backgroundColor: "var(--kg-surface)", border: "1px solid var(--kg-border-medium)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--kg-text)" }}>{category}</p>
              <p className="text-xs" style={{ color: "var(--kg-text-muted)" }}>直近7日間</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-num text-xl font-semibold" style={{ color: "var(--kg-accent)" }}>{formatVND(total)}</p>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--kg-text-muted)" }}><X size={18} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {txs === null ? (
            <div className="px-6 py-8 space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
          ) : txs.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--kg-text-muted)" }}>この期間の取引はありません</p>
          ) : (
            <div>
              {txs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-3.5 border-b last:border-0" style={{ borderColor: "var(--kg-border-subtle)" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--kg-text)" }}>{tx.store}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kg-text-muted)" }}>{formatDate(tx.date)}</p>
                  </div>
                  <p className="font-num text-sm font-semibold ml-4 shrink-0" style={{ color: "var(--kg-text)" }}>{formatVND(tx.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
  // merge all categories from both periods
  const allCategories = Array.from(
    new Set([...categoryBreakdown.map((c) => c.name), ...Object.keys(prevCategoryBreakdown)])
  );
  const rows = allCategories
    .map((cat) => {
      const current = categoryBreakdown.find((c) => c.name === cat)?.value ?? 0;
      const prev = prevCategoryBreakdown[cat] ?? 0;
      const diff = prev > 0 ? Math.round(((current - prev) / prev) * 100) : null;
      return { cat, current, prev, diff };
    })
    .sort((a, b) => b.current - a.current);

  const improved = weekDiff <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-up"
        style={{ backgroundColor: "var(--kg-surface)", border: "1px solid var(--kg-border-medium)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--kg-text)" }}>直近7日間 vs 前の7日間</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kg-text-muted)" }}>カテゴリ別の変化</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-num text-xl font-semibold" style={{ color: improved ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {weekDiff > 0 ? "+" : ""}{weekDiff}%
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--kg-text-muted)" }}><X size={18} /></button>
          </div>
        </div>

        {/* totals row */}
        <div className="flex border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
          <div className="flex-1 px-6 py-3 text-center border-r" style={{ borderColor: "var(--kg-border-subtle)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--kg-text-muted)" }}>直近7日間</p>
            <p className="font-num text-base font-semibold" style={{ color: "var(--kg-text)" }}>{formatVND(thisWeekTotal)}</p>
          </div>
          <div className="flex-1 px-6 py-3 text-center">
            <p className="text-xs mb-1" style={{ color: "var(--kg-text-muted)" }}>前の7日間</p>
            <p className="font-num text-base font-semibold" style={{ color: "var(--kg-text-muted)" }}>{formatVND(lastWeekTotal)}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-2 py-2">
            {rows.map(({ cat, current, prev, diff }) => (
              <div key={cat} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ marginBottom: 2 }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--kg-text)" }}>{cat}</p>
                  {prev > 0 && (
                    <p className="text-xs mt-0.5 font-num" style={{ color: "var(--kg-text-muted)" }}>前 {formatVND(prev)}</p>
                  )}
                </div>
                <p className="font-num text-sm font-semibold shrink-0" style={{ color: "var(--kg-text)" }}>
                  {current > 0 ? formatVND(current) : "—"}
                </p>
                {diff !== null && (
                  <span className="font-num text-xs font-semibold w-12 text-right shrink-0"
                    style={{ color: diff <= 0 ? "var(--kg-success)" : "var(--kg-danger)" }}>
                    {diff > 0 ? "+" : ""}{diff}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [feedback, setFeedback] = useState<DashboardFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "upToDate">("idle");
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [popupCategory, setPopupCategory] = useState<{ name: string; colorIndex: number } | null>(null);
  const [showWeekCompare, setShowWeekCompare] = useState(false);

  const monthTotal = useCountUp(data?.thisMonthTotal ?? null);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    if (!res.ok) return;
    setData(json);
    if (json.categoryBreakdown?.length > 0) {
      setFeedbackLoading(true);
      const r = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dashboard",
          data: Object.fromEntries(
            json.categoryBreakdown.map((c: { name: string; value: number }) => [c.name, c.value])
          ),
        }),
      });
      const result = await r.json();
      if (result.feedback) setFeedback(result.feedback as DashboardFeedback);
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncState("idle");
    setSyncProgress(null);
    let totalSynced = 0;
    let estimatedTotal = 0;
    let processed = 0;

    try {
      // 残りがなくなるまで自動で連続取得
      while (true) {
        const res = await fetch("/api/gmail/sync");
        let json: { synced?: number; remaining?: number; error?: string } = {};
        try { json = await res.json(); } catch {
          toast.error("同期失敗: サーバーエラー（タイムアウトの可能性があります）");
          break;
        }
        if (!res.ok) { toast.error(`同期失敗: ${json.error ?? res.status}`); break; }

        const remaining = json.remaining ?? 0;
        totalSynced += json.synced ?? 0;
        processed += 100;

        // 初回で全体像を把握
        if (estimatedTotal === 0) estimatedTotal = processed + remaining;
        const done = Math.min(processed, estimatedTotal);
        setSyncProgress({ done, total: estimatedTotal });

        if (remaining === 0) break;
        // まだ残りがある → ループ継続
      }

      setSyncState("upToDate");
      if (totalSynced > 0) toast.success(`${totalSynced}件の取引を取得しました`);
      setTimeout(() => setSyncState("idle"), 5000);
      fetchDashboard();
    } catch (e) {
      toast.error(`同期失敗: ${e instanceof Error ? e.message : "network error"}`);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  // 月末予測 vs 目標
  const projected = data?.projectedMonthTotal ?? null;
  const target = data?.targetMonthly ?? 0;
  const projVsTarget = projected != null && target > 0
    ? projected > target
      ? { text: `目標 ${formatVND(target)} を超過見込み`, ok: false }
      : { text: `目標 ${formatVND(target)} 内で推移中`, ok: true }
    : null;

  // 直近7日間 vs 前の7日間
  const weekImproved = data ? data.weekDiff <= 0 : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--kg-text)" }}>ダッシュボード</h1>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: syncState === "upToDate" ? "rgba(82,183,136,0.1)" : "var(--kg-surface-2)",
            color: syncState === "upToDate" ? "var(--kg-success)" : "var(--kg-accent)",
            border: syncState === "upToDate" ? "1px solid rgba(82,183,136,0.35)" : "1px solid var(--kg-border-medium)",
            minWidth: 120,
          }}>
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing && syncProgress
            ? `${syncProgress.done}/${syncProgress.total}件`
            : syncing
            ? "同期中..."
            : syncState === "upToDate"
            ? "最新の状態"
            : "同期"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* 今月の出費 + 月末予測 */}
        <div className="kg-card p-7 animate-fade-up" style={{ animationDelay: "0ms", animationFillMode: "both" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>今月の出費</p>
          <p className="font-num text-4xl font-semibold leading-none" style={{ color: "var(--kg-text)" }}>
            {data ? formatVND(monthTotal) : "—"}
          </p>
          {projected && (
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--kg-text-muted)" }}>
              月末予測 <span className="font-num" style={{ color: projVsTarget ? (projVsTarget.ok ? "var(--kg-success)" : "var(--kg-danger)") : "var(--kg-text)" }}>
                {formatVND(projected)}
              </span>
            </p>
          )}
          {projVsTarget && (
            <p className="mt-1 text-xs flex items-center gap-1"
              style={{ color: projVsTarget.ok ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {projVsTarget.ok ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {projVsTarget.text}
            </p>
          )}
          <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
        </div>

        {/* 直近7日間の出費 */}
        <div className="kg-card p-7 animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>直近7日間の出費</p>
          <p className="font-num text-4xl font-semibold leading-none" style={{ color: "var(--kg-text)" }}>
            {data ? formatVND(data.thisWeekTotal) : "—"}
          </p>
          {data && data.lastWeekTotal > 0 && (
            <button className="mt-2 flex items-center gap-1 text-sm font-medium rounded-lg transition-opacity hover:opacity-70"
              onClick={() => setShowWeekCompare(true)}
              style={{ color: weekImproved ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {weekImproved ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {weekImproved
                ? `前の7日間より倹約（${Math.abs(data.weekDiff)}%↓）`
                : `前の7日間より増加（${data.weekDiff}%↑）`}
              <ChevronRight size={13} className="opacity-60" />
            </button>
          )}
          <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
        </div>

        {/* ダム残高 */}
        <div className="kg-card p-7 animate-fade-up" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>ダム残高</p>
          <p className="font-num text-4xl font-semibold leading-none"
            style={{ color: data ? (data.damBalance >= 0 ? "var(--kg-success)" : "var(--kg-danger)") : "var(--kg-text)" }}>
            {data ? formatVND(data.damBalance) : "—"}
          </p>
          {data && (
            <p className="mt-2 text-sm font-medium flex items-center gap-1"
              style={{ color: data.damBalance >= 0 ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {data.damBalance >= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {data.damBalance >= 0 ? "今月は黒字" : "今月は赤字"}
            </p>
          )}
          <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        {/* Donut */}
        <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "var(--kg-text-muted)" }}>直近7日間の内訳</p>
          {data?.categoryBreakdown?.length ? (
            <div className="flex flex-col items-center gap-4">
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categoryBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      dataKey="value" paddingAngle={2}
                      onClick={(entry: { name?: string }, index: number) => {
                        if (entry.name) setPopupCategory({ name: entry.name, colorIndex: index });
                      }}
                      style={{ cursor: "pointer" }}>
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
              <div className="w-full space-y-0.5">
                {data.categoryBreakdown.slice(0, 6).map((item, i) => {
                  const prev = data.prevCategoryBreakdown?.[item.name] ?? 0;
                  const diff = prev > 0 ? Math.round(((item.value - prev) / prev) * 100) : null;
                  return (
                    <button key={item.name} className="flex items-center gap-2 w-full text-left rounded-lg px-2 py-1.5 transition-colors"
                      style={{ backgroundColor: "transparent" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--kg-surface-2)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                      onClick={() => setPopupCategory({ name: item.name, colorIndex: i })}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-xs truncate flex-1" style={{ color: "var(--kg-text-muted)" }}>{item.name}</span>
                      <span className="text-xs font-num font-medium" style={{ color: "var(--kg-text)" }}>{formatVND(item.value)}</span>
                      {diff !== null && (
                        <span className="text-xs font-num font-medium w-10 text-right shrink-0"
                          style={{ color: diff <= 0 ? "var(--kg-success)" : "var(--kg-danger)" }}>
                          {diff > 0 ? "+" : ""}{diff}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center py-16 text-sm" style={{ color: "var(--kg-text-muted)" }}>直近7日間の取引データがありません</p>
          )}
        </div>

        {/* 支出チェック (AI) */}
        <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>支出チェック</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
              <Sparkles size={10} /> AI
            </span>
          </div>

          {feedbackLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-14 w-full rounded-xl" />
              <div className="skeleton h-14 w-full rounded-xl" />
              <div className="skeleton h-14 w-full rounded-xl" />
            </div>
          ) : feedback ? (
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--kg-surface-2)" }}>
                <p className="text-xs font-medium mb-1.5" style={{ color: "var(--kg-text-muted)" }}>今週の状況</p>
                <p className="text-sm leading-6" style={{ color: "var(--kg-text-secondary)" }}>{feedback.summary}</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--kg-surface-2)" }}>
                <p className="text-xs font-medium mb-1.5" style={{ color: "var(--kg-accent)" }}>注目のポイント</p>
                <p className="text-sm leading-6" style={{ color: "var(--kg-text-secondary)" }}>{feedback.point}</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--kg-surface-2)" }}>
                <p className="text-xs font-medium mb-1.5" style={{ color: "var(--kg-text-muted)" }}>一言アドバイス</p>
                <p className="text-sm leading-6" style={{ color: "var(--kg-text-secondary)" }}>{feedback.tip}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>取引データを同期するとチェックが表示されます</p>
          )}
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
              <div key={tx.id}
                className="flex items-center justify-between px-7 py-4 border-b last:border-0 transition-colors"
                style={{ borderColor: "var(--kg-border-subtle)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--kg-surface-2)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}>
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
          <p className="text-sm text-center py-16" style={{ color: "var(--kg-text-muted)" }}>取引データがありません。同期ボタンを押してください。</p>
        )}
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
