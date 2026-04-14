"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { formatVND } from "@/lib/format";
import type { MonthRecord } from "@/app/api/dam/route";

interface DamData {
  targetMonthly: number;
  thisMonthTotal: number;
  currentBalance: number;
  achievementRate: number;
  cumulativeBalance: number;
  damLevel: number;
  months: MonthRecord[];
  damStartLabel: string;
}

function DamVisual({ level }: { level: number }) {
  const pct = Math.max(0, Math.min(level, 100));
  const waterTop = 220 - (pct / 100) * 200;

  return (
    <div className="flex flex-col items-center py-6">
      <svg width="260" height="260" viewBox="0 0 260 260">
        <defs>
          <clipPath id="damClip">
            <rect x="14" y="14" width="232" height="232" rx="12" />
          </clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52B788" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1B4332" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="14" y="14" width="232" height="232" rx="12" fill="var(--kg-surface-2)" stroke="var(--kg-border-medium)" strokeWidth="1.5" />
        <g clipPath="url(#damClip)">
          <rect x="14" y={14 + waterTop} width="232" height={232 - waterTop} fill="url(#waterGrad)" />
          <path
            style={{ animation: "wave 3.5s ease-in-out infinite" }}
            d={`M -10 ${14 + waterTop + 6} Q 75 ${14 + waterTop - 8} 140 ${14 + waterTop + 6} Q 210 ${14 + waterTop + 20} 280 ${14 + waterTop + 6} L 280 260 L -10 260 Z`}
            fill="rgba(82,183,136,0.35)"
          />
        </g>
        <text x="130" y="122" textAnchor="middle" fontSize="52" fontWeight="600"
          fontFamily="var(--font-noto, sans-serif)"
          fill={pct > 45 ? "#E8F5E9" : "var(--kg-accent)"}>
          {pct}%
        </text>
        <text x="130" y="150" textAnchor="middle" fontSize="13"
          fontFamily="var(--font-noto, sans-serif)"
          fill={pct > 45 ? "rgba(232,245,233,0.6)" : "var(--kg-text-muted)"}
          letterSpacing="3">
          WATER LEVEL
        </text>
      </svg>
      <style>{`@keyframes wave { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-24px)} }`}</style>
    </div>
  );
}

export default function DamPage() {
  const [data, setData] = useState<DamData | null>(null);
  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dam").then(async (r) => {
      if (!r.ok) return;
      const json: DamData = await r.json();
      setData(json);
      if (json.cumulativeBalance !== 0) {
        setCommentLoading(true);
        const res = await fetch("/api/ai/comment", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ type: "dam", data: { cumulativeBalance: json.cumulativeBalance } }),
        });
        const { comment: c } = await res.json();
        setComment(c); setCommentLoading(false);
      }
    });
  }, []);

  const currentMonth = data?.months[data.months.length - 1];

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
        <div className="kg-card-static p-6 animate-fade-up">
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--kg-text-muted)" }}>累計ダム貯水状況</p>
          <DamVisual level={data?.damLevel ?? 0} />
          {data && (
            <p className="text-center text-xs mt-1" style={{ color: "var(--kg-text-muted)" }}>
              全期間の節約累計 / 最大想定額に対する割合
            </p>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {/* 今月の貯水量 */}
          <div className="kg-card p-7 animate-fade-up flex-1" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>今月の貯水量</p>
            <p className="font-num text-3xl font-semibold" style={{ color: data ? (data.currentBalance >= 0 ? "var(--kg-success)" : "var(--kg-danger)") : "var(--kg-text)" }}>
              {data ? formatVND(data.currentBalance) : "—"}
            </p>
            {data && (
              <p className="mt-2 text-xs flex items-center gap-1" style={{ color: data.currentBalance >= 0 ? "var(--kg-success)" : "var(--kg-danger)" }}>
                {data.currentBalance >= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                予算 {formatVND(data.targetMonthly)} に対して {formatVND(data.thisMonthTotal)} 支出
              </p>
            )}
            <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
          </div>

          {/* 達成率 */}
          <div className="kg-card p-7 animate-fade-up flex-1" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>今月の達成率</p>
            <p className="font-num text-3xl font-semibold" style={{ color: "var(--kg-accent)" }}>
              {data ? `${data.achievementRate}%` : "—"}
            </p>
            <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
          </div>

          {/* 累計残高 */}
          <div className="kg-card p-7 animate-fade-up flex-1" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--kg-text-muted)" }}>累計ダム残高</p>
            <p className="font-num text-3xl font-semibold" style={{ color: data ? (data.cumulativeBalance >= 0 ? "var(--kg-success)" : "var(--kg-danger)") : "var(--kg-text)" }}>
              {data ? formatVND(data.cumulativeBalance) : "—"}
            </p>
            <div className="mt-4 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
          </div>
        </div>
      </div>

      {/* 月別積み立て履歴 */}
      {data && data.months.length > 0 && (
        <div className="kg-card-static mb-6 animate-fade-up" style={{ animationDelay: "280ms" }}>
          <div className="px-7 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>
              月別積み立て履歴
            </p>
          </div>
          <div>
            {/* ヘッダー行 */}
            <div className="grid grid-cols-5 gap-4 px-7 py-3 text-xs font-medium uppercase tracking-wider border-b"
              style={{ color: "var(--kg-text-muted)", borderColor: "var(--kg-border-subtle)", backgroundColor: "var(--kg-surface-2)" }}>
              <span>月</span>
              <span className="text-right">予算</span>
              <span className="text-right">支出</span>
              <span className="text-right">差額</span>
              <span className="text-right">累計</span>
            </div>
            {[...data.months].reverse().map((m) => {
              const isCurrent = currentMonth?.key === m.key;
              const saved = m.balance >= 0;
              return (
                <div key={m.key}
                  className="grid grid-cols-5 gap-4 px-7 py-4 border-b last:border-0 items-center"
                  style={{
                    borderColor: "var(--kg-border-subtle)",
                    backgroundColor: isCurrent ? "rgba(82,183,136,0.04)" : "transparent",
                    borderLeft: isCurrent ? "3px solid var(--kg-accent)" : "3px solid transparent",
                  }}>
                  <span className="text-sm font-medium" style={{ color: isCurrent ? "var(--kg-accent)" : "var(--kg-text)" }}>
                    {m.label}{isCurrent && <span className="ml-1 text-xs" style={{ color: "var(--kg-accent)", opacity: 0.7 }}>（今月）</span>}
                  </span>
                  <span className="text-sm font-num text-right" style={{ color: "var(--kg-text-muted)" }}>{formatVND(m.target)}</span>
                  <span className="text-sm font-num text-right" style={{ color: "var(--kg-text)" }}>{formatVND(m.spent)}</span>
                  <span className="text-sm font-num font-semibold text-right flex items-center justify-end gap-1"
                    style={{ color: saved ? "var(--kg-success)" : "var(--kg-danger)" }}>
                    {saved ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
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
        </div>
      )}

      {/* AIコメント */}
      <div className="kg-card-static p-7 animate-fade-up" style={{ animationDelay: "360ms" }}>
        <div className="flex items-center gap-2 mb-5">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>このお金で何ができる？</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
            <Sparkles size={10} /> AI
          </span>
        </div>
        <div className="border-l-2 pl-4" style={{ borderColor: "var(--kg-accent)" }}>
          {commentLoading ? (
            <div className="space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-4/5" /><div className="skeleton h-4 w-2/3" /></div>
          ) : comment ? (
            <p className="text-sm leading-7 italic" style={{ color: "var(--kg-text-secondary)" }}>{comment}</p>
          ) : (
            <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>設定画面で合計月支出を設定すると提案が表示されます</p>
          )}
        </div>
      </div>
    </div>
  );
}
