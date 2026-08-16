-- 賃貸更新料の自動計上に使う、固定費カテゴリ向けの任意メタデータ。
-- is_fixed=false のカテゴリでは無視する。両方nullなら更新料ロジックは適用しない。
-- renewal_cycle_years: 契約更新の周期(年)。例: 2年ごと更新なら2。
-- renewal_fee_months: 更新月にその時点の月額(category_budget_overridesの実効値)に
--   掛け合わせて単発計上する月数分。例: 家賃1ヶ月分なら1。
alter table piggybank.categories
  add column if not exists renewal_cycle_years integer,
  add column if not exists renewal_fee_months numeric(4, 2);
