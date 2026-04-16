"use client";

import { BookOpen, ExternalLink } from "lucide-react";

const QUOTES = [
  { text: "収入を上げるより、支出を下げる方が確実で、即効性がある。", author: "倹約家の格言" },
  { text: "欲しいものより、必要なものを買え。その差額が自由になる。", author: "倹約哲学" },
  { text: "金持ちになる方法はひとつ。入ってくるより少ない額を使うこと。", author: "サミュエル・ジョンソン" },
  { text: "我慢ではなく、価値ある選択だ。それが倹約の本質。", author: "KenyakuGo" },
  { text: "小さな漏れが、大きなダムを空にする。", author: "倹約哲学" },
  { text: "今日の100円が、10年後の1万円になる。", author: "複利の法則" },
  { text: "安いから買うのではなく、必要だから買う。", author: "倹約家の格言" },
  { text: "お金を使わない日は、お金が貯まる日だ。", author: "倹約哲学" },
  { text: "質素な生活習慣こそが、富の真の源泉である。", author: "トーマス・J・スタンリー" },
  { text: "本当に大切なものはそんなにたくさんない。それに気づくのが第一歩。", author: "ミニマリスト哲学" },
  { text: "ベース支出を下げれば、どんな収入でも生き残れる。", author: "FIREムーブメント" },
  { text: "衝動買いは感情への投資であり、たいてい利回りがマイナスだ。", author: "行動経済学" },
  { text: "値段ではなく、価値で買え。", author: "倹約哲学" },
  { text: "節約とは貧しく生きることではなく、自由を設計することだ。", author: "KenyakuGo" },
];

const PHILOSOPHY = [
  {
    title: "倹約とは「我慢」ではない",
    body: "倹約の本質は、価値のないものへの支出を減らし、本当に大切なものにお金を使うことです。ベトナムでの生活なら、外食を完全にやめるのではなく「ローカル食堂で満足する日」と「特別なレストランで楽しむ日」を意識的に設けることが倹約の実践です。どこにお金を使わないかを決めることで、どこにお金を使うかが際立つのです。",
    accent: "var(--kg-accent)",
  },
  {
    title: "ベース支出を下げれば、自由が生まれる",
    body: "毎月の固定的な支出（家賃・通信費・食費の基礎部分）を最適化すると、収入の変動に左右されにくくなります。ホーチミンでは、エリアを少し変えるだけで家賃が半分になることも珍しくありません。ベース支出の見直しは一度の決断で毎月効果が続く強力な手段です。1万円/月の削減は年間12万円、10年で120万円の差を生みます。",
    accent: "var(--kg-warning)",
  },
  {
    title: "ダム式積み立ての哲学",
    body: "月ごとの余りを「ダム」に貯めていき、本当に使いたいタイミングで一気に放流する。日々の小さな節約が目に見えるかたちで積み上がることで、節約が苦行ではなくゲームになります。ダムの水位が上がる快感が次の行動を生む。それがこのアプリの目指す体験です。",
    accent: "var(--kg-success)",
  },
  {
    title: "衝動と習慣を区別せよ",
    body: "支出の多くは「習慣」です。毎日のコーヒー、週末のデリバリー、気づかないサブスクリプション。これらは意思決定ではなく、惰性です。一方で「旅行に行く」「好きな人に贈り物をする」は明確な意思決定。この2つを区別することが、倹約の出発点です。",
    accent: "#C084FC",
  },
];

const HABITS = [
  { emoji: "📊", title: "週1回の支出確認", desc: "日曜夜10分、アプリを開いて今週の支出を見直す。意識するだけで無駄遣いが減る。" },
  { emoji: "⏳", title: "24時間ルール", desc: "3,000円以上の衝動買いは24時間待つ。翌日もまだ欲しければ本物の需要だ。" },
  { emoji: "📋", title: "買い物リスト厳守", desc: "スーパーでは事前リストのみ購入。空腹時の買い物は避ける。" },
  { emoji: "🔄", title: "サブスク棚卸し", desc: "月1回、使っていないサブスクを解約する。年間数万円が戻ってくることも。" },
  { emoji: "💡", title: "代替案を探す習慣", desc: "何か買う前に「タダか安く手に入る方法はないか？」と考える癖をつける。" },
  { emoji: "🎯", title: "目的を先に決める", desc: "「今月は○○のために貯める」と目標を先に設定する。目的のある節約は続く。" },
];

const HCMC_TIPS = [
  { emoji: "🛵", tip: "GrabバイクよりXe omはさらに安い。慣れれば交渉次第でGrabの半額以下に。" },
  { emoji: "🍜", tip: "フォーやバインミーは15,000〜30,000₫。路上屋台はチェーン店の3分の1の値段で本物の味。" },
  { emoji: "🛒", tip: "Big CやCoopMartより、ローカル市場（chợ）で野菜・果物を買うと半額以下のことも。" },
  { emoji: "📱", tip: "Vietnamobileの20,000₫/月プランは通話・データが十分。大手キャリアより大幅に安い。" },
  { emoji: "🏠", tip: "Bình ThạnhやGò Vấpエリアは家賃がD1の半額以下のことも。通勤コストと天秤に。" },
  { emoji: "☕", tip: "Cà phê sữa đáはどこでも20,000〜30,000₫。ハイランドコーヒーより3〜4倍安い。" },
  { emoji: "🏋️", tip: "フィットネスはローカルジムが100,000〜200,000₫/月。カリフォルニアフィットネスの10分の1以下。" },
  { emoji: "🎬", tip: "映画はCGVのオフピーク（平日午前）なら70,000₫台。会員登録で割引も。" },
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
  // 日付で格言をローテーション
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];

  return (
    <div>
      <div className="flex items-center gap-3 mb-10">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--kg-text)" }}>倹約コラム</h1>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ backgroundColor: "rgba(82,183,136,0.12)", color: "var(--kg-accent)" }}>
          Learn
        </span>
      </div>

      {/* 今日の格言 */}
      <div className="kg-card-static p-8 mb-6 animate-fade-up"
        style={{ background: "linear-gradient(135deg, rgba(82,183,136,0.06) 0%, rgba(45,106,79,0.03) 100%)", border: "1px solid rgba(82,183,136,0.15)" }}>
        <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: "var(--kg-accent)" }}>今日の格言</p>
        <p className="text-xl font-semibold leading-8 mb-3" style={{ color: "var(--kg-text)" }}>
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-sm" style={{ color: "var(--kg-text-muted)" }}>— {quote.author}</p>
      </div>

      {/* 倹約の哲学 */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
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

      {/* 倹約の習慣 */}
      <div className="kg-card-static p-7 mb-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <p className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "var(--kg-text-muted)" }}>
          今日からできる倹約の習慣
        </p>
        <div className="grid grid-cols-2 gap-3">
          {HABITS.map((h, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl"
              style={{ backgroundColor: "var(--kg-surface-2)" }}>
              <span className="text-xl shrink-0">{h.emoji}</span>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--kg-text)" }}>{h.title}</p>
                <p className="text-xs leading-5" style={{ color: "var(--kg-text-secondary)" }}>{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ホーチミンでの倹約術 */}
      <div className="kg-card-static p-7 mb-6 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <p className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "var(--kg-text-muted)" }}>
          ホーチミンでの倹約術
        </p>
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
