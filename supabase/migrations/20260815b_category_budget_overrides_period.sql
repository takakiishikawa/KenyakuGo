-- カテゴリ予算オーバーライドに「期間限定」オプションを追加する。
--
-- 従来(20260815_category_budget_overrides.sql)は「month 以降ずっと」だけだった
-- (effective-dated / 恒久変更)。今回 end_month を追加し、
--   end_month が null        → 従来通り。month 以降、次のオーバーライドが
--                               入るまでずっと適用される(恒久変更)。
--   end_month が month以降の値 → month〜end_month の期間だけ適用され、
--                               期間を過ぎると自動的に元(恒久側の解決結果)に戻る(一時変更)。
-- 同じ月が両方の対象になった場合は「期間限定」側が優先される
-- (アプリ側 lib/category-budget.ts の resolveBudgetsForMonth で解決)。
alter table piggybank.category_budget_overrides
  add column if not exists end_month text;

alter table piggybank.category_budget_overrides
  add constraint category_budget_overrides_end_month_format
    check (end_month is null or end_month ~ '^\d{4}-\d{2}$');

alter table piggybank.category_budget_overrides
  add constraint category_budget_overrides_end_month_after_month
    check (end_month is null or end_month >= month);

-- 元は unique(category_id, month) で「同じカテゴリ・同じ開始月は1件まで」
-- だったが、同じ開始月に「ずっと」と「期間限定」を両方登録できるようにしたいので、
-- 恒久変更(end_month is null)の行同士に限定した部分ユニークインデックスに置き換える。
-- 期間限定の行はアプリ側で常に新規 insert する運用とし、DB制約では重複を禁止しない。
alter table piggybank.category_budget_overrides
  drop constraint if exists category_budget_overrides_category_id_month_key;

create unique index if not exists category_budget_overrides_persistent_unique_idx
  on piggybank.category_budget_overrides (category_id, month)
  where end_month is null;
