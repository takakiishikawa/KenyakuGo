-- カテゴリ予算の月次オーバーライド。
-- categories.budget は「オーバーライドが一度も設定されていない期間」に使われる
-- ベース値として維持する（後方互換・既存データの移行不要）。
-- 対象月 M の実効予算は「month <= M の中で最も新しい行」、無ければ categories.budget。
-- つまり一度設定した値はそれ以降の月にずっと引き継がれる（effective-dated）。
-- 例:
--   Rent: 2026-09 に低い値を1件登録 → 9月以降ずっと新家賃（恒久変更）
--   Groceries: 2026-09 にほぼ0、2026-10 に通常額を登録 → 9月だけ下がり10月は自動で戻る（一時変更）
create table if not exists piggybank.category_budget_overrides (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references piggybank.categories(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  budget integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, month)
);

create index if not exists category_budget_overrides_category_month_idx
  on piggybank.category_budget_overrides (category_id, month);

alter table piggybank.category_budget_overrides enable row level security;

create policy "auth all access" on piggybank.category_budget_overrides
  for all to authenticated
  using (true)
  with check (true);
