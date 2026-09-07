// 投資方針メモの初期値(元のメモそのまま)。DBのテーブル・行がまだ無い場合の
// フォールバック表示に使う(supabase/migrations/20260907_investment_policy.sql
// のシード値と同じ内容 — migration未適用でもポップアップに内容が出るように)。
export const DEFAULT_INVESTMENT_POLICY = {
  account: "IBKR(ベトナム居住者としてIB LLCで開設)に一本化",
  strategy: "コア・サテライト。毎月定額の自動積立",
  cash: "100万円のみ残し、残りは全額投資",
  universe: "インデックス投資のみ。FX・先物・信用取引はしない",
  core_note: "オルカン・S&Pを1:1",
  satellite_note: "東南アジア株の投資信託。中国・韓国・ミャンマーは除外。値動きは荒くてよい",
  remarks:
    "銀行→IBKRの入金は自動化不可、都度手動。毎月少額送金は手数料負けするため、数ヶ月に1回まとめて送金する",
} as const;
