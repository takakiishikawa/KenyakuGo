"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, TrendingDown, TrendingUp, Send, RotateCcw } from "lucide-react";
import { formatVND } from "@/lib/format";
import type { MonthRecord } from "@/app/api/dam/route";

interface Recommendation { emoji: string; title: string; description: string; estimatedCost: string; link: string; linkLabel: string; }
interface QAResult { theme: string; recommendations: Recommendation[]; }

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

const QUESTIONS = [
  { id: "goal", question: "節約したお金で、叶えたいことや欲しいものはありますか？" },
  { id: "timing", question: "それはいつ頃実現したいですか？（例：今月末、3ヶ月後、来年）" },
  { id: "free", question: "他に気になること・条件・制約があれば教えてください" },
];

const QA_STORAGE_KEY = "kg-dam-qa";

function DamVisual({ level, amount }: { level: number; amount: number }) {
  const pct = Math.max(0, Math.min(level, 100));
  const waterTop = 200 - (pct / 100) * 180;
  const amountSaved = amount >= 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="220" viewBox="0 0 260 240">
        <defs>
          <clipPath id="damClip"><rect x="14" y="14" width="232" height="212" rx="12" /></clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52B788" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1B4332" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="14" y="14" width="232" height="212" rx="12" fill="var(--kg-surface-2)" stroke="var(--kg-border-medium)" strokeWidth="1.5" />
        <g clipPath="url(#damClip)">
          <rect x="14" y={14 + waterTop} width="232" height={212 - waterTop} fill="url(#waterGrad)" />
          <path style={{ animation: "wave 3.5s ease-in-out infinite" }}
            d={`M -10 ${14+waterTop+5} Q 75 ${14+waterTop-7} 140 ${14+waterTop+5} Q 210 ${14+waterTop+17} 280 ${14+waterTop+5} L 280 240 L -10 240 Z`}
            fill="rgba(82,183,136,0.32)" />
        </g>
        <text x="130" y="108" textAnchor="middle" fontSize="38" fontWeight="700"
          fontFamily="var(--font-noto, sans-serif)"
          fill={pct > 45 ? "#E8F5E9" : "var(--kg-accent)"}>
          {pct}%
        </text>
        <text x="130" y="135" textAnchor="middle" fontSize="11"
          fontFamily="var(--font-noto, sans-serif)"
          fill={pct > 45 ? "rgba(232,245,233,0.65)" : "var(--kg-text-muted)"} letterSpacing="2">
          WATER LEVEL
        </text>
      </svg>
      <div className="mt-3 text-center">
        <p className="text-xs mb-1" style={{ color: "var(--kg-text-muted)" }}>累計貯水残高</p>
        <p className="font-num text-2xl font-bold" style={{ color: amountSaved ? "var(--kg-success)" : "var(--kg-danger)" }}>
          {amountSaved ? "+" : ""}{formatVND(amount)}
        </p>
      </div>
      <style>{`@keyframes wave{0%,100%{transform:translateX(0)}50%{transform:translateX(-22px)}}`}</style>
    </div>
  );
}

function QASection({ data }: { data: DamData }) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(QA_STORAGE_KEY) ?? "{}"); } catch { return {}; }
  });
  const [result, setResult] = useState<QAResult | null>(null);
  const [loading, setLoading] = useState(false);

  const saveAnswers = (next: Record<string, string>) => {
    setAnswers(next);
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(next));
  };

  const hasAnyAnswer = QUESTIONS.some((q) => answers[q.id]?.trim());

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setResult(null);
    const qaList = QUESTIONS.map((q) => ({ question: q.question, answer: answers[q.id] ?? "" }));
    const res = await fetch("/api/ai/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "dam-qa",
        data: {
          cumulativeBalance: data.cumulativeBalance,
          projectedBalance: data.currentBalance,
          targetMonthly: data.targetMonthly,
          monthsCount: data.months.length,
          answers: qaList,
        },
      }),
    });
    const json = await res.json();
    if (json.feedback) setResult(json.feedback as QAResult);
    setLoading(false);
  }, [answers, data]);

  const handleReset = () => {
    saveAnswers({});
    setResult(null);
  };

  return (
    <div className="kg-card-static p-7 mb-6 animate-fade-up" style={{ animationDelay: "280ms" }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>
            このお金で何をする？
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
            <Sparkles size={10} /> AI提案
          </span>
        </div>
        {hasAnyAnswer && (
          <button onClick={handleReset} className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: "var(--kg-text-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--kg-text)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--kg-text-muted)")}>
            <RotateCcw size={11} /> リセット
          </button>
        )}
      </div>

      {/* Q&Aフォーム */}
      <div className="space-y-4 mb-5">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="rounded-xl p-4" style={{ backgroundColor: "var(--kg-surface-2)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--kg-accent)" }}>
              Q. {q.question}
            </p>
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => saveAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder="ここに入力..."
              rows={q.id === "free" ? 2 : 1}
              className="w-full resize-none text-sm outline-none bg-transparent"
              style={{ color: "var(--kg-text)", caretColor: "var(--kg-accent)" }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleGenerate}
          disabled={loading || !hasAnyAnswer}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          style={{ backgroundColor: "var(--kg-accent)", color: "var(--kg-bg)" }}>
          <Send size={13} />
          {loading ? "提案を生成中..." : "提案を見る"}
        </button>
        <p className="text-xs" style={{ color: "var(--kg-text-muted)" }}>
          累計 {formatVND(data.cumulativeBalance)} · 今月節約見込み {formatVND(data.currentBalance)}
        </p>
      </div>

      {/* 提案カード */}
      {loading && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl p-5 space-y-3" style={{ backgroundColor: "var(--kg-surface-2)" }}>
              <div className="skeleton h-8 w-8 rounded-full" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-4/5 rounded" />
              <div className="skeleton h-7 w-1/2 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {result && !loading && (
        <div>
          {result.theme && (
            <div className="mb-4 px-4 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--kg-accent)" }}>🎯 {result.theme}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="rounded-xl p-5 flex flex-col gap-2"
                style={{ backgroundColor: "var(--kg-surface-2)", border: "1px solid var(--kg-border-subtle)" }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl">{rec.emoji}</span>
                  <span className="font-num text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
                    {rec.estimatedCost}
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--kg-text)" }}>{rec.title}</p>
                <p className="text-xs leading-5 flex-1" style={{ color: "var(--kg-text-muted)" }}>{rec.description}</p>
                {rec.link && (
                  <a href={rec.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all w-fit mt-1"
                    style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(82,183,136,0.2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(82,183,136,0.12)"; }}>
                    <span>↗</span> {rec.linkLabel}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DamPage() {
  const [data, setData] = useState<DamData | null>(null);

  useEffect(() => {
    fetch("/api/dam").then(async (r) => {
      if (!r.ok) return;
      const json: DamData = await r.json();
      setData(json);
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
        {/* ダムビジュアル + 累計金額 */}
        <div className="kg-card-static p-6 animate-fade-up flex flex-col items-center justify-center">
          <p className="text-xs font-medium uppercase tracking-widest mb-4 self-start" style={{ color: "var(--kg-text-muted)" }}>
            累計ダム貯水状況
          </p>
          <DamVisual level={data?.damLevel ?? 0} amount={data?.cumulativeBalance ?? 0} />
        </div>

        {/* カード群 */}
        <div className="flex flex-col gap-4">
          {/* 今月の倹約額 */}
          <div className="kg-card p-6 animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--kg-text-muted)" }}>今月の倹約額（予測）</p>
            <p className="font-num text-3xl font-semibold" style={{ color: saved ? "var(--kg-success)" : "var(--kg-danger)" }}>
              {data ? formatVND(data.currentBalance) : "—"}
            </p>
            {data && (
              <div className="mt-2 space-y-0.5">
                <p className="text-xs" style={{ color: "var(--kg-text-muted)" }}>
                  支出実績: <span className="font-num" style={{ color: "var(--kg-text)" }}>{formatVND(data.thisMonthTotal)}</span>
                  &nbsp;/&nbsp;月末予測: <span className="font-num" style={{ color: saved ? "var(--kg-success)" : "var(--kg-danger)" }}>{formatVND(data.projectedMonthTotal)}</span>
                </p>
              </div>
            )}
            <div className="mt-3 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, var(--kg-accent), transparent)" }} />
          </div>

          {/* 今月の達成率 */}
          <div className="kg-card p-6 animate-fade-up" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--kg-text-muted)" }}>今月の倹約達成率</p>
            <p className="font-num text-3xl font-semibold" style={{ color: "var(--kg-accent)" }}>
              {data ? `${data.achievementRate}%` : "—"}
            </p>
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

      {/* Q&A + AI提案 */}
      {data && <QASection data={data} />}

      {/* 月別積み立て履歴 */}
      {data && data.months.length > 0 && (
        <div className="kg-card-static animate-fade-up" style={{ animationDelay: "360ms" }}>
          <div className="px-7 py-5 border-b" style={{ borderColor: "var(--kg-border-subtle)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>月別倹約履歴</p>
          </div>
          <div className="grid px-7 py-3 text-xs font-medium uppercase tracking-wider border-b"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
              color: "var(--kg-text-muted)", borderColor: "var(--kg-border-subtle)", backgroundColor: "var(--kg-surface-2)",
            }}>
            <span>月</span>
            <span className="text-right">予算</span>
            <span className="text-right">月末予測</span>
            <span className="text-right">倹約額</span>
            <span className="text-right">累計</span>
          </div>
          {[...data.months].reverse().map((m) => {
            const isCurrent = currentMonth?.key === m.key;
            const monthSaved = m.balance >= 0;
            return (
              <div key={m.key} className="grid items-center px-7 py-4 border-b last:border-0"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                  borderColor: "var(--kg-border-subtle)",
                  backgroundColor: isCurrent ? "rgba(82,183,136,0.04)" : "transparent",
                  borderLeft: isCurrent ? "3px solid var(--kg-accent)" : "3px solid transparent",
                }}>
                <span className="text-sm font-medium" style={{ color: isCurrent ? "var(--kg-accent)" : "var(--kg-text)" }}>
                  {m.label}{isCurrent && <span className="ml-1 text-xs opacity-60">（今月）</span>}
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
