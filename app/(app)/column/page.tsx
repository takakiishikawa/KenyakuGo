"use client";

import {
  Brain,
  Zap,
  Quote,
  Lightbulb,
  Clock,
  ShoppingCart,
  RefreshCw,
  Target,
  Users,
  Star,
} from "lucide-react";
import { Badge, Card, PageHeader } from "@takaki/go-design-system";

const QUOTES = [
  {
    text: "収入を上げるより、支出を下げる方が確実で、即効性がある。",
    author: "倹約家の格言",
    bio: null,
  },
  {
    text: "欲しいものより、必要なものを買え。その差額が自由になる。",
    author: "倹約哲学",
    bio: null,
  },
  {
    text: "金持ちになる方法はひとつ。入ってくるより少ない額を使うこと。",
    author: "サミュエル・ジョンソン",
    bio: "18世紀イギリスの詩人・評論家・辞書編纂者。英語初の本格的辞書を独力で編纂し、実用的な人生哲学を数多く残した。",
  },
  {
    text: "我慢ではなく、価値ある選択だ。それが倹約の本質。",
    author: "倹約哲学",
    bio: null,
  },
  {
    text: "小さな漏れが、大きなダムを空にする。",
    author: "倹約哲学",
    bio: null,
  },
  {
    text: "今日の100円が、10年後の1万円になる。",
    author: "複利の法則",
    bio: null,
  },
  {
    text: "安いから買うのではなく、必要だから買う。",
    author: "倹約家の格言",
    bio: null,
  },
  {
    text: "質素な生活習慣こそが、富の真の源泉である。",
    author: "トーマス・J・スタンリー",
    bio: "アメリカの経済学者・作家。20年以上かけて全米の富裕層を調査した著書「となりの億万長者」で、本当の金持ちは高級車や豪邸とは無縁の質素な生活をしていると実証した。",
  },
  {
    text: "本当に大切なものはそんなにたくさんない。それに気づくのが第一歩。",
    author: "ミニマリスト哲学",
    bio: null,
  },
  {
    text: "ベース支出を下げれば、どんな収入でも生き残れる。",
    author: "FIREムーブメント",
    bio: null,
  },
  {
    text: "衝動買いは感情への投資であり、たいてい利回りがマイナスだ。",
    author: "行動経済学",
    bio: null,
  },
  { text: "値段ではなく、価値で買え。", author: "倹約哲学", bio: null },
  {
    text: "節約とは貧しく生きることではなく、自由を設計することだ。",
    author: "倹約哲学",
    bio: null,
  },
  {
    text: "支出を半分にするのは、収入を倍にするより簡単だ。",
    author: "倹約家の格言",
    bio: null,
  },
];

const PHILOSOPHY = [
  {
    icon: Brain,
    title: "倹約とは「我慢」ではない",
    body: "倹約の本質は、価値のないものへの支出を減らし、本当に大切なものにお金を使うことです。外食を完全にやめるのではなく「ローカル食堂で満足する日」と「特別なレストランで楽しむ日」を意識的に設けることが倹約の実践です。どこにお金を使わないかを決めることで、どこにお金を使うかが際立つのです。",
    accent: "var(--kg-accent)",
  },
  {
    icon: Target,
    title: "ベース支出を下げれば、自由が生まれる",
    body: "毎月の固定的な支出（家賃・通信費・食費の基礎部分）を最適化すると、収入の変動に左右されにくくなります。ベース支出の見直しは一度の決断で毎月効果が続く強力な手段です。1万円/月の削減は年間12万円、10年で120万円の差を生みます。",
    accent: "var(--kg-warning)",
  },
  {
    icon: Zap,
    title: "ダム式積み立ての哲学",
    body: "月ごとの余りを「ダム」に貯めていき、本当に使いたいタイミングで一気に放流する。日々の小さな節約が目に見えるかたちで積み上がることで、節約が苦行ではなくゲームになります。ダムの水位が上がる快感が次の行動を生む。",
    accent: "var(--kg-success)",
  },
  {
    icon: Lightbulb,
    title: "衝動と習慣を区別せよ",
    body: "支出の多くは「習慣」です。毎日のコーヒー、週末のデリバリー、気づかないサブスクリプション。これらは意思決定ではなく、惰性です。一方で「旅行に行く」「好きな人に贈り物をする」は明確な意思決定。この2つを区別することが倹約の出発点です。",
    accent: "#C084FC",
  },
];

const HABITS = [
  {
    icon: Star,
    title: "週1回の支出確認",
    desc: "日曜夜10分、アプリを開いて今週の支出を見直す。意識するだけで無駄遣いが減る。",
  },
  {
    icon: Clock,
    title: "24時間ルール",
    desc: "3,000円以上の衝動買いは24時間待つ。翌日もまだ欲しければ本物の需要だ。",
  },
  {
    icon: ShoppingCart,
    title: "買い物リスト厳守",
    desc: "スーパーでは事前リストのみ購入。空腹時の買い物は避ける。",
  },
  {
    icon: RefreshCw,
    title: "サブスク棚卸し",
    desc: "月1回、使っていないサブスクを解約する。年間数万円が戻ってくることも。",
  },
  {
    icon: Lightbulb,
    title: "代替案を探す習慣",
    desc: "何か買う前に「タダか安く手に入る方法はないか？」と考える癖をつける。",
  },
  {
    icon: Users,
    title: "目的を先に決める",
    desc: "「今月は○○のために貯める」と目標を先に設定する。目的のある節約は続く。",
  },
];

export default function ColumnPage() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  const quote = QUOTES[dayOfYear % QUOTES.length];

  return (
    <div>
      <PageHeader
        title="マインドセット"
        actions={
          <Badge className="bg-primary/10 text-primary border-0">Learn</Badge>
        }
      />

      <Card
        className="p-8 mt-8 mb-6 animate-fade-up"
        style={{
          background:
            "linear-gradient(135deg, rgba(82,183,136,0.06) 0%, rgba(45,106,79,0.03) 100%)",
          border: "1px solid rgba(82,183,136,0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Quote size={15} style={{ color: "var(--kg-accent)" }} />
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "var(--kg-accent)" }}
          >
            今日の格言
          </p>
        </div>
        <p
          className="text-xl font-semibold leading-8 mb-4"
          style={{ color: "var(--kg-text)" }}
        >
          &ldquo;{quote.text}&rdquo;
        </p>
        <div
          className="flex items-start gap-3 pt-4 border-t"
          style={{ borderColor: "var(--kg-border)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--kg-surface-2)" }}
          >
            <Star size={13} style={{ color: "var(--kg-accent)" }} />
          </div>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--kg-text)" }}
            >
              {quote.author}
            </p>
            {quote.bio && (
              <p className="text-sm leading-6 mt-1 text-muted-foreground">
                {quote.bio}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="mb-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <Brain size={15} className="text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            倹約の哲学
          </p>
        </div>
        <div className="space-y-3">
          {PHILOSOPHY.map((p, i) => {
            const Icon = p.icon;
            return (
              <Card
                key={i}
                className="p-6 flex gap-4"
                style={{ borderLeft: `3px solid ${p.accent}` }}
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${p.accent}18` }}
                >
                  <Icon size={17} style={{ color: p.accent }} />
                </div>
                <div>
                  <p
                    className="text-sm font-semibold mb-2"
                    style={{ color: "var(--kg-text)" }}
                  >
                    {p.title}
                  </p>
                  <p
                    className="text-sm leading-7"
                    style={{ color: "var(--kg-text-secondary)" }}
                  >
                    {p.body}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="p-7 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2 mb-5">
          <Zap size={15} className="text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            今日からできる倹約の習慣
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {HABITS.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ backgroundColor: "var(--kg-surface-2)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--kg-surface-2)" }}
                >
                  <Icon size={15} style={{ color: "var(--kg-accent)" }} />
                </div>
                <div>
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--kg-text)" }}
                  >
                    {h.title}
                  </p>
                  <p
                    className="text-sm leading-6"
                    style={{ color: "var(--kg-text-secondary)" }}
                  >
                    {h.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}