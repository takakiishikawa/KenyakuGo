-- 実際に投資した金額の記録(ダッシュボードの「投資を記録」ボタンから登録)。
-- Simulationの月次表示で、経過済みの月は「実際にいくら投資したか」をそのまま
-- 使い、未経過の月は引き続きSimulation設定の想定利率・積立比率に基づく
-- projectionを使う(投資額を入れるまでは過去も¥0として扱う)。
-- 金額はTransactions/Categoriesと同じくVND建てで保存する(実際のお金の動きの
-- 記録なので、Dashboard側のデータモデルに合わせる)。
create table if not exists piggybank.investment_entries (
  id uuid primary key default gen_random_uuid(),
  amount_vnd bigint not null,
  invested_on date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists investment_entries_invested_on_idx
  on piggybank.investment_entries (invested_on);

alter table piggybank.investment_entries enable row level security;

create policy "auth all access" on piggybank.investment_entries
  for all to authenticated
  using (true)
  with check (true);
