"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, BookOpen, Lightbulb, TrendingDown, ExternalLink } from "lucide-react";
import { formatVND } from "@/lib/format";

interface PersonalInsight {
  headline: string;
  insight: string;
  action: string;
}

interface ColumnAIData {
  insights: PersonalInsight[];
  monthlyTheme: string;
}

// 静的コンテンツ: 倹約哲学
const PHILOSOPHY = [
  {
    title: "倹約とは「我慢」ではない",
    body: "倹約の本質は、価値のないものへの支出を減らし、本当に大切なものにお金を使うことです。ベトナムでの生活なら、外食を完全にやめるのではなく「ローカル食堂で満足する日」と「特別なレストランで楽しむ日」を意識的に設けることが倹約の実践です。",
    accent: "var(--kg-accent)",
  },
  {
    title: "ベース支出を下げれば、自由が生まれる",
    body: "毎月の固定的な支出（家賃・通信費・食費の基礎部分）を最適化すると、収入の変動に左右されにくくなります。ホーチミンでは、エリアを少し変えるだけで家賃が半分になることも珍しくありません。ベース支出の見直しは一度の決断で毎月効果が続く強力な手段です。",
    accent: "var(--kg-warning)",
  },
  {
    title: "ダム式積み立ての哲学",
    body: "月ごとの余りを「ダム」に貯めていき、本当に使いたいタイミングで一気に放流する。日々の小さな節約が目に見えるかたちで積み上がることで、節約が苦行ではなくゲームになります。このアプリが目指すのは、その「ダムの水位が上がる快感」です。",
    accent: "var(--kg-success)",
  },
];

const HCMC_TIPS = [
  { emoji: "🛵", tip: "GrabよりもXe omやBanh miはローカル価格を探す。慣れれば大幅節約。" },
  { emoji: "🍜", tip: "フォーやバインミーは15,000〜30,000₫。チェーン店より路上屋台が断然安くて美味。" },
  { emoji: "🛒", tip: "Big CやCoopMartより、ローカル市場（chợ）で野菜・果物を買うと半額以下になることも。" },
  { emoji: "📱", tip: "Vietnamobileの20,000₫/月プランは通話・データが十分。大手キャリアより大幅に安い。" },
  { emoji: "🏠", tip: "Bình ThạnhやGò Vấpエリアは家賃がD1の半額以下のことも。通勤コストと天秤に。" },
  { emoji: "☕", tip: "Cà phê sữa đáはどこでも20,000〜30,000₫。ハイランドコーヒーより3〜4倍安い。" },
];

const REFERENCES = [
  {
    title: "お金は寝かせて増やしなさい",
    author: "水瀬ケンイチ",
    desc: "インデックス投資の入門書。節約して余ったお金をどう増やすかの基礎。",
    tag: "📗 書籍",
  },
  {
    title: "となりの億万長者",
    author: "トーマス・J・スタンリー",
    desc: "アメリカの富裕層研究。「質素な生活習慣」こそが富の源泉であることを統計で示す古典。",
    tag: "📙 書籍",
  },
  {
    title: "FIRE 最強の早期リタイア術",
    author: "クリスティー・シェン",
    desc: "カナダ在住の中国系移民夫婦が30代でリタイアした実践的節約・投資の記録。",
    tag: "📘 書籍",
  },
  {
    title: "ミニマリスト式超節約術",
    author: "植村拓哉",
    desc: "モノを減らすことで支出そのものの機会を減らす「攻めの節約」の考え方。",
    tag: "📕 書籍",
  },
];

export default function ColumnPage() {
  const [dashData, setDashData] = useState<{
    categoryBreakdown: { name: string; value: number }[];
    thisMonthTotal: number;
    targetMonthly: number;
  } | null>(null);
  const [aiData, setAiData] = useState<ColumnAIData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchInsights = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return;
    const json = await res.json();
    setDashData(json);

    if (json.categoryBreakdown?.length > 0) {
      setAiLoading(true);
      const catStr = json.categoryBreakdown
        .slice(0, 5)
        .map((c: { name: string; value: number }) => `${c.name}: ${c.value.toLocaleString("vi-VN")} ₫`)
        .join("、");

      const r = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "column",
          data: {
            categories: catStr,
            thisMonthTotal: json.thisMonthTotal,
            targetMonthly: json.targetMonthly,
          },
        }),
      });
      const result = await r.json();
      if (result.feedback) setAiData(result.feedback as ColumnAIData);
      setAiLoading(false);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-10">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--kg-text)" }}>倹約コラム</h1>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
          Learn
        </span>
      </div>

      {/* あなたの今月の状況 × AI洞察 */}
      <div className="kg-card-static p-7 mb-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-5">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>
            あなたの今月の状況から
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
            <Sparkles size={10} /> AI
          </span>
        </div>

        {dashData && (
          <div className="flex items-center gap-6 mb-5 p-4 rounded-xl" style={{ backgroundColor: "var(--kg-surface-2)" }}>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "var(--kg-text-muted)" }}>今月の支出</p>
              <p className="font-num text-xl font-semibold" style={{ color: "var(--kg-text)" }}>{formatVND(dashData.thisMonthTotal)}</p>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: "var(--kg-border)" }} />
            <div>
              <p className="text-xs mb-0.5" style={{ color: "var(--kg-text-muted)" }}>月予算</p>
              <p className="font-num text-xl font-semibold" style={{ color: "var(--kg-accent)" }}>{formatVND(dashData.targetMonthly)}</p>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: "var(--kg-border)" }} />
            <div>
              <p className="text-xs mb-0.5" style={{ color: "var(--kg-text-muted)" }}>主な支出カテゴリ</p>
              <div className="flex gap-1 flex-wrap">
                {dashData.categoryBreakdown.slice(0, 3).map((c) => (
                  <span key={c.name} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {aiLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : aiData ? (
          <div className="space-y-3">
            {aiData.monthlyTheme && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--kg-accent)" }}>今月のテーマ</p>
                <p className="text-sm font-semibold" style={{ color: "var(--kg-text)" }}>{aiData.monthlyTheme}</p>
              </div>
            )}
            {aiData.insights?.map((insight, i) => (
              <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: "var(--kg-surface-2)" }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ backgroundColor: "rgba(82,183,136,0.15)", color: "var(--kg-accent)" }}>
                    <Lightbulb size={13} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--kg-text)" }}>{insight.headline}</p>
                    <p className="text-sm leading-6 mb-2" style={{ color: "var(--kg-text-secondary)" }}>{insight.insight}</p>
                    <p className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--kg-accent)" }}>
                      <TrendingDown size={11} /> {insight.action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>取引を同期すると、あなたの支出に基づいた洞察が表示されます。</p>
        )}
      </div>

      {/* 倹約の哲学 */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={15} style={{ color: "var(--kg-text-muted)" }} />
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>倹約の哲学</p>
        </div>
        <div className="space-y-4">
          {PHILOSOPHY.map((p, i) => (
            <div key={i} className="kg-card-static p-6"
              style={{ borderLeft: `3px solid ${p.accent}` }}>
              <p className="text-base font-semibold mb-3" style={{ color: "var(--kg-text)" }}>{p.title}</p>
              <p className="text-sm leading-7" style={{ color: "var(--kg-text-secondary)" }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ホーチミン節約術 */}
      <div className="kg-card-static p-7 mb-6 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center gap-2 mb-5">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>
            ホーチミンでの節約ヒント
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {HCMC_TIPS.map((t, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl"
              style={{ backgroundColor: "var(--kg-surface-2)" }}>
              <span className="text-xl shrink-0">{t.emoji}</span>
              <p className="text-sm leading-6" style={{ color: "var(--kg-text-secondary)" }}>{t.tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 参考文献 */}
      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink size={14} style={{ color: "var(--kg-text-muted)" }} />
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>参考文献・おすすめ本</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {REFERENCES.map((ref, i) => (
            <div key={i} className="kg-card-static p-5">
              <span className="text-xs px-2 py-0.5 rounded-full mb-3 inline-block"
                style={{ backgroundColor: "var(--kg-surface-2)", color: "var(--kg-text-muted)" }}>
                {ref.tag}
              </span>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--kg-text)" }}>{ref.title}</p>
              <p className="text-xs mb-2" style={{ color: "var(--kg-text-muted)" }}>{ref.author}</p>
              <p className="text-xs leading-5" style={{ color: "var(--kg-text-secondary)" }}>{ref.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
