import { ConceptPage } from "@takaki/go-design-system";
import { Leaf } from "lucide-react";

export default function ConceptPageRoute() {
  return (
    <ConceptPage
      productName="KenyakuGo"
      productLogo={<Leaf size={20} style={{ color: "var(--color-primary)" }} />}
      tagline="ベース支出を抑えて、使う時に使う。"
      coreMessage="KenyakuGoは「我慢の節約」ではなく「価値ある選択」を支援する家計管理ツールです。Gmailの支払いメールを自動取得し、支出を可視化。毎月の余剰を「ダム」に貯め、本当に使いたい時に放流するライフスタイルを実現します。"
      coreValue="節約とは自由の設計である。ベース支出を下げるほど、人生の選択肢が広がる。KenyakuGoは支出の記録に留まらず、「どこにお金を使わないか」の意思決定を継続的にサポートし、経済的な自由への道筋を示します。"
      scope={{
        solve: [
          "Gmailからの支出データ自動取得",
          "カテゴリ別支出の可視化と傾向分析",
          "月次・週次レポートとAIフィードバック",
          "ダム式貯蓄残高の算出・管理",
          "固定費・変動費のベースライン把握",
        ],
        notSolve: [
          "銀行口座・証券口座との連携",
          "投資ポートフォリオ管理",
          "複数通貨・複数人世帯の管理",
          "ローン・保険の管理",
          "予算の自動振り分け",
        ],
      }}
      productLogic={{
        steps: [
          {
            title: "メール自動取得",
            description:
              "Gmailの支払い通知メールをAIが解析し、店名・金額・日付を自動抽出します。",
          },
          {
            title: "AIカテゴリ分類",
            description:
              "同一店舗の過去データを学習し、支出を食費・交通費などに自動分類します。",
          },
          {
            title: "支出パターン分析",
            description:
              "週次・月次レポートで支出の増減を可視化。AIが具体的な改善提案を提示します。",
          },
          {
            title: "ダム残高の蓄積",
            description:
              "目標予算との差額が「ダム」に積み上がり、次の大きな支出への備えになります。",
          },
        ],
        outcome: "ベース支出が下がり、毎月の余裕が生まれ、お金の不安が減る",
      }}
      resultMetric={{
        title: "月間ベース支出の削減",
        description:
          "利用開始から3ヶ月で、無意識の習慣的支出が平均15%削減されることを目指します。これは年間換算で数万円の差額となり、ダム残高として蓄積されます。",
      }}
      behaviorMetrics={[
        {
          title: "週1回の支出確認率",
          description:
            "週次レポートを開いて支出を確認する習慣が定着しているかを計測します。目標: 月4回以上",
        },
        {
          title: "カテゴリ分類完了率",
          description:
            "「その他」に分類されたまま放置されている取引がゼロに近い状態を維持します。目標: 95%以上",
        },
        {
          title: "ダム残高の成長率",
          description:
            "月次でダム残高がプラスになっている月の割合を計測します。目標: 月の75%以上",
        },
        {
          title: "AIフィードバック閲覧率",
          description:
            "週次レポートのAIコメントを閲覧するセッションの割合。目標: 60%以上",
        },
      ]}
    />
  );
}
