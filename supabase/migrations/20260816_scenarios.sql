-- 新Simulation機能: 家族・収入・教育・イベント・貯蓄の前提を保存する「シナリオ」。
-- 「暮らし」(固定費/変動費)の実額は既存の piggybank.categories /
-- piggybank.category_budget_overrides をそのまま使い(Dashboardの実績表示と共有)、
-- ここにはカテゴリでは表現できない前提だけを1つのJSONBにまとめて持つ。
--
-- config の形:
-- {
--   "family": { "spouse": boolean, "kids": [{ "birthYear": number }] },
--   "income": {
--     "husband": { "amountYen": number, "raisePercent": number },
--     "wife": { "amountYen": number, "raisePercent": number },
--     "side": { "amountYen": number }
--   },
--   "education": { "<kidIndex>": { "<stageKey>": "<optionKey>" } },
--   "events": [{ "id": string, "label": string, "year": number, "month": number, "amountYen": number }],
--   "savings": { "returnRatePercent": number, "investRatioPercent": number },
--   "inflationRatePercent": number
-- }
create table if not exists piggybank.scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_primary boolean not null default false,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- is_primary=true になれるのは常に高々1件(単体表示・設定モーダルの初期選択に使う)。
create unique index if not exists scenarios_primary_unique_idx
  on piggybank.scenarios (is_primary)
  where is_primary;

alter table piggybank.scenarios enable row level security;

create policy "auth all access" on piggybank.scenarios
  for all to authenticated
  using (true)
  with check (true);

insert into piggybank.scenarios (name, is_primary, config)
select 'ベースプラン', true, '{
  "family": { "spouse": true, "kids": [] },
  "income": {
    "husband": { "amountYen": 450000, "raisePercent": 2 },
    "wife": { "amountYen": 250000, "raisePercent": 1.5 },
    "side": { "amountYen": 30000 }
  },
  "education": {},
  "events": [],
  "savings": { "returnRatePercent": 5, "investRatioPercent": 60 },
  "inflationRatePercent": 1
}'::jsonb
where not exists (select 1 from piggybank.scenarios);
