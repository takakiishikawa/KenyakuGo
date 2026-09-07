-- 投資方針メモ(口座・戦略・現金・投資対象・コア/サテライト配分・備考)。
-- サイドバーのポップアップからいつでも参照・編集できるようにするための
-- 単一レコードテーブル(単一ユーザー個人アプリのため、id列をシングルトン
-- 制約にして1行のみ許可する)。
create table if not exists piggybank.investment_policy (
  id boolean primary key default true,
  account text not null default '',
  strategy text not null default '',
  cash text not null default '',
  universe text not null default '',
  core_note text not null default '',
  satellite_note text not null default '',
  remarks text not null default '',
  updated_at timestamptz not null default now(),
  constraint investment_policy_singleton check (id)
);

alter table piggybank.investment_policy enable row level security;

create policy "auth all access" on piggybank.investment_policy
  for all to authenticated
  using (true)
  with check (true);

-- 初期値としてこれまでポップアップに固定表示していた内容を1行だけ投入する。
insert into piggybank.investment_policy
  (id, account, strategy, cash, universe, core_note, satellite_note, remarks)
values (
  true,
  'IBKR(ベトナム居住者としてIB LLCで開設)に一本化',
  'コア・サテライト。毎月定額の自動積立',
  '100万円のみ残し、残りは全額投資',
  'インデックス投資のみ。FX・先物・信用取引はしない',
  'オルカン・S&Pを1:1',
  '東南アジア株の投資信託。中国・韓国・ミャンマーは除外。値動きは荒くてよい',
  '銀行→IBKRの入金は自動化不可、都度手動。毎月少額送金は手数料負けするため、数ヶ月に1回まとめて送金する'
)
on conflict (id) do nothing;
