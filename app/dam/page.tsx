"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";
import type { MonthRecord } from "@/app/api/dam/route";

interface Suggestion { emoji: string; title: string; detail: string; }

interface DamData {
  targetMonthly: number;
  fixedCosts: number;
  thisMonthTotal: number;
  projectedMonthTotal: number;
  currentBalance: number;
  achievementRate: number;
  cumulativeBalance: number;
  damLevel: number;
  months: MonthRecord[];
  categoryBreakdown: Record<string, number>;
  damStartLabel: string;
}

function DamVisual({ level }: { level: number }) {
  const pct = Math.max(0, Math.min(level, 100));
  const waterTop = 220 - (pct / 100) * 200;
  return (
    <div className="flex flex-col items-center py-6">
      <svg width="240" height="240" viewBox="0 0 260 260">
        <defs>
          <clipPath id="damClip"><rect x="14" y="14" width="232" height="232" rx="12" /></clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52B788" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1B4332" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="14" y="14" width="232" height="232" rx="12" fill="var(--kg-surface-2)" stroke="var(--kg-border-medium)" strokeWidth="1.5" />
        <g clipPath="url(#damClip)">
          <rect x="14" y={14 + waterTop} width="232" height={232 - waterTop} fill="url(#waterGrad)" />
          <path style={{ animation: "wave 3.5s ease-in-out infinite" }}
            d={`M -10 ${14+waterTop+6} Q 75 ${14+waterTop-8} 140 ${14+waterTop+6} Q 210 ${14+waterTop+20} 280 ${14+waterTop+6} L 280 260 L -10 260 Z`}
            fill="rgba(82,183,136,0.35)" />
        </g>
        <text x="130" y="122" textAnchor="middle" fontSize="52" fontWeight="600"
          fontFamily="var(--font-noto, sans-serif)"
          fill={pct > 45 ? "#E8F5E9" : "var(--kg-accent)"}>{pct}%</text>
        <text x="130" y="150" textAnchor="middle" fontSize="13"
          fontFamily="var(--font-noto, sans-serif)"
          fill={pct > 45 ? "rgba(232,245,233,0.6)" : "var(--kg-text-muted)"} letterSpacing="3">
          WATER LEVEL
        </text>
      </svg>
      <style>{`@keyframes wave{0%,100%{transform:translateX(0)}50%{transform:translateX(-24px)}}`}</style>
    </div>
  );
}

export default function DamPage() {
  const [data, setData] = useState<DamData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dam").then(async (r) => {
      if (!r.ok) return;
      const json: DamData = await r.json();
      setData(json);

      // AIコメントを取得（累計または今月に残高がある場合）
      if (json.cumulativeBalance !== 0 || json.currentBalance > 0) {
        setSuggestLoading(true);
        const res = await fetch("/api/ai/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "dam",
            data: {
              cumulativeBalance: json.cumulativeBalance,
              currentBalance: json.currentBalance,
              targetMonthly: json.targetMonthly,
              categoryBreakdown: json.categoryBreakdown,
            },
          }),
        });
        const result = await res.json();
        const feedback = result.feedback as { suggestions?: Suggestion[] } | undefined;
        if (feedback?.suggestions) setSuggestions(feedback.suggestions);
        setSuggestLoading(false);
      }
    });
  }, []);

  const currentMonth = data?.months[data.months.length - 1];
  const saved = (data?.currentBalance ?? 0) >= 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--kg-text)" }}>貯蓄ダム</h1>
        {data && (
          <p className="text-xs" style={{ color: "var(--kg-text-muted)" }}>
            {data.damStartLabel}〜 · 予算 {formatVND(data.targetMonthly)}/月
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* ダムビジュアル */}
        <div className="kg-card-static p-6 animate-fade-up flex flex-col items-center">
          <p className="text-xs font-medium uppercase tracking-widest mb-1 self-start" style={{ color: "var(--kg-text-muted)" }}>
            累計ダム貯水状況
          </p>
          <DamVisual level={data?.damLevel ?? 0} />
          <p className="text-xs text-center" style={{ color: "var(--kg-text-muted)" }}>
            節約累計 / 全期間の最大想定額に対する割合
          </p>
        </div>

        {/* カード群 */}
        <div className="flex flex-col gap-4">
          {/* 今月の節約見込み */}
          <div className="kg-card p-6 animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--kg-text-muted)" }}>今月の節約見込み</p>
            <p className="font-num text-3xl font-semibold" style={{ color: saved ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {data ? formatVND(data.currentBalance) : "—"}
            </p>
            {data && (
              <div className="mt-2 space-y-0.5">
                <p className="text-xs flex items-center gap-1" style={{ color: "var(--kg-text-muted)" }}>
                  支出実績: <span className="font-num" style={{ color: "var(--kg-text)" }}>{formatVND(data.thisMonthTotal)}</span>
                </p>
                <p className="text-xs flex items-center gap-1" style={{ color: "var(--kg-text-muted)" }}>
                  月末予測: <span className="font-num" style={{ color: saved ? "var(--kg-success)" : "var(--kg-danger)" }}>{formatVND(data.projectedMonthTotal)}</span>
                </p>
              </div>
            )}
            <div className="mt-3 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
          </div>

          {/* 今月の達成率 */}
          <div className="kg-card p-6 animate-fade-up" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--kg-text-muted)" }}>今月の達成率</p>
            <p className="font-num text-3xl font-semibold" style={{ color: "var(--kg-accent)" }}>
              {data ? `${data.achievementRate}%` : "—"}
            </p>
            {data && (
              <p className="text-xs mt-1 flex items-center gap-1"
                style={{ color: saved ? "var(--kg-success)" : "var(--kg-danger)" }}>
                {saved ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                {saved ? "予算内で推移中" : "予算超過ペース"}
              </p>
            )}
            <div className="mt-3 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
          </div>

          {/* 累計残高 */}
          <div className="kg-card p-6 animate-fade-up" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--kg-text-muted)" }}>累計ダム残高</p>
            <p className="font-num text-3xl font-semibold"
              style={{ color: data ? (data.cumulativeBalance >= 0 ? "var(--kg-success)" : "var(--kg-danger)") : "var(--kg-text)" }}>
              {data ? formatVND(data.cumulativeBalance) : "—"}
            </p>
            <div className="mt-3 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
          </div>
        </div>
      </div>

      {/* AI提案: このお金で何ができる？ */}
      <div className="kg-card-static p-7 mb-6 animate-fade-up" style={{ animationDelay: "280ms" }}>
        <div className="flex items-center gap-2 mb-5">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>このお金で何ができる？</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
            <Sparkles size={10} /> AI
          </span>
        </div>

        {suggestLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl p-5 space-y-2" style={{ backgroundColor: "var(--kg-surface-2)" }}>
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {suggestions.map((s, i) => (
              <div key={i} className="rounded-xl p-5 transition-all"
                style={{ backgroundColor: "var(--kg-surface-2)", border: "1px solid var(--kg-border-subtle)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(82,183,136,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--kg-border-subtle)"; }}>
                <div className="text-3xl mb-3">{s.emoji}</div>
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--kg-text)" }}>{s.title}</p>
                <p className="text-xs leading-5" style={{ color: "var(--kg-text-muted)" }}>{s.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>
            取引を同期すると、あなたの支出パターンに合わせた提案が表示されます。
          </p>
        )}
      </div>

      {/* 月別積み立て履歴 */}
      {data && data.months.length > 0 && (
        <div className="kg-card-static animate-fade-up" style={{ animationDelay: "360ms" }}>
          <div className="px-7 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>月別積み立て履歴</p>
          </div>
          {/* ヘッダー */}
          <div className="grid px-7 py-3 text-xs font-medium uppercase tracking-wider border-b"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
              color: "var(--kg-text-muted)",
              borderColor: "var(--kg-border-subtle)",
              backgroundColor: "var(--kg-surface-2)",
            }}>
            <span>月</span>
            <span className="text-right">予算</span>
            <span className="text-right">月末予測</span>
            <span className="text-right">節約額</span>
            <span className="text-right">累計</span>
          </div>
          {[...data.months].reverse().map((m) => {
            const isCurrent = currentMonth?.key === m.key;
            const monthSaved = m.balance >= 0;
            return (
              <div key={m.key}
                className="grid items-center px-7 py-4 border-b last:border-0"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                  borderColor: "var(--kg-border-subtle)",
                  backgroundColor: isCurrent ? "rgba(82,183,136,0.04)" : "transparent",
                  borderLeft: isCurrent ? "3px solid var(--kg-accent)" : "3px solid transparent",
                }}>
                <span className="text-sm font-medium" style={{ color: isCurrent ? "var(--kg-accent)" : "var(--kg-text)" }}>
                  {m.label}
                  {isCurrent && <span className="ml-1 text-xs opacity-60">（今月）</span>}
                </span>
                <span className="text-sm font-num text-right" style={{ color: "var(--kg-text-muted)" }}>{formatVND(m.target)}</span>
                <span className="text-sm font-num text-right" style={{ color: "var(--kg-text)" }}>{formatVND(m.projected)}</span>
                <span className="text-sm font-num font-semibold text-right flex items-center justify-end gap-1"
                  style={{ color: monthSaved ? "var(--kg-success)" : "var(--kg-danger)" }}>
                  {monthSaved ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {m.balance > 0 ? "+" : ""}{formatVND(m.balance)}
                </span>
                <span className="text-sm font-num font-semibold text-right"
                  style={{ color: m.cumulative >= 0 ? "var(--kg-success)" : "var(--kg-danger)" }}>
                  {m.cumulative > 0 ? "+" : ""}{formatVND(m.cumulative)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
