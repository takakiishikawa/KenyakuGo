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
    desc: "インデックス投資の入門書。倹約して余ったお金をどう増やすかの基礎。長期・分散・低コストの原則を平易に解説。",
    color: "#1a4b6e",
    textColor: "#a8d8f0",
    link: "https://www.amazon.co.jp/s?k=%E3%81%8A%E9%87%91%E3%81%AF%E5%AF%9D%E3%81%8B%E3%81%9B%E3%81%A6%E5%A2%97%E3%82%84%E3%81%97%E3%81%AA%E3%81%95%E3%81%84+%E6%B0%B4%E7%80%AC%E3%82%B1%E3%83%B3%E3%82%A4%E3%83%81",
  },
  {
    title: "となりの億万長者",
    author: "トーマス・J・スタンリー",
    desc: "アメリカの富裕層研究。「質素な生活習慣」こそが富の源泉であることを統計で示す古典。倹約と資産形成の関係を実証的に解き明かす。",
    color: "#6b3a1f",
    textColor: "#f5c98a",
    link: "https://www.amazon.co.jp/s?k=%E3%81%A8%E3%81%AA%E3%82%8A%E3%81%AE%E5%84%84%E4%B8%87%E9%95%B7%E8%80%85",
  },
  {
    title: "FIRE 最強の早期リタイア術",
    author: "クリスティー・シェン",
    desc: "カナダ在住の中国系移民夫婦が30代でリタイアした実践的記録。支出率の管理と資産の4%ルールを具体的に解説。",
    color: "#1b4332",
    textColor: "#95d5b2",
    link: "https://www.amazon.co.jp/s?k=FIRE+%E6%9C%80%E5%BC%B7%E3%81%AE%E6%97%A9%E6%9C%9F%E3%83%AA%E3%82%BF%E3%82%A4%E3%82%A2+%E3%82%AF%E3%83%AA%E3%82%B9%E3%83%86%E3%82%A3%E3%83%BC%E3%83%BB%E3%82%B7%E3%82%A7%E3%83%B3",
  },
  {
    title: "ミニマリスト式超節約術",
    author: "植村拓哉",
    desc: "モノを減らすことで支出機会を根本から減らす「攻めの倹約」の考え方。所有と幸福の関係を再定義する。",
    color: "#3d1a1a",
    textColor: "#f5a0a0",
    link: "https://www.amazon.co.jp/s?k=%E3%83%9F%E3%83%8B%E3%83%9E%E3%83%AA%E3%82%B9%E3%83%88%E5%BC%8F%E8%B6%85%E7%AF%80%E7%B4%84%E8%A1%93",
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

      {/* 倹約術 */}
      <div className="kg-card-static p-7 mb-6 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center gap-2 mb-5">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>
            ホーチミンでの倹約術
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
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--kg-text-muted)" }}>倹約を深める本</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {REFERENCES.map((ref, i) => (
            <a key={i} href={ref.link} target="_blank" rel="noopener noreferrer"
              className="kg-card-static p-5 flex gap-4 transition-all group"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              {/* 書籍カバー */}
              <div className="shrink-0 flex flex-col items-center justify-center rounded-lg px-2 py-3"
                style={{ width: 64, minHeight: 90, backgroundColor: ref.color }}>
                <p className="text-center leading-tight" style={{ fontSize: 9, color: ref.textColor, wordBreak: "break-all" }}>
                  {ref.title}
                </p>
                <div className="mt-2 w-8 border-t opacity-30" style={{ borderColor: ref.textColor }} />
                <p className="mt-1 text-center" style={{ fontSize: 8, color: ref.textColor, opacity: 0.7 }}>
                  {ref.author}
                </p>
              </div>
              {/* 説明 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1 group-hover:underline" style={{ color: "var(--kg-text)" }}>
                  {ref.title}
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--kg-text-muted)" }}>{ref.author}</p>
                <p className="text-xs leading-5" style={{ color: "var(--kg-text-secondary)" }}>{ref.desc}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs" style={{ color: "var(--kg-accent)" }}>
                  <ExternalLink size={10} /> Amazon で見る
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
