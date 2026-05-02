-- サブスク AI 判定キャッシュ
-- 候補店舗ごとに「サブスクか否か」を Claude が判定し、結果を保存する

create table if not exists kenyakugo.subscription_judgments (
  store text primary key,
  is_subscription boolean not null,
  reasoning text,
  judged_at timestamptz not null default now()
);

alter table kenyakugo.subscription_judgments enable row level security;

create policy "auth all access" on kenyakugo.subscription_judgments
  for all to authenticated
  using (true)
  with check (true);
