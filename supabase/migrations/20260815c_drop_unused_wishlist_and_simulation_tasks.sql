-- Wishlist機能(Reportページから削除済み)と、Simulationページのthread機能
-- (アーカイブ/タスク)を単純なノート機能へ置き換えたことに伴い、
-- アプリ側から一切参照されなくなったテーブル・カラムを削除する。
--
-- simulation_task_comments は simulation_tasks を参照しており、
-- 一度もUI/APIが実装されずに残っていた完全な未使用テーブル。
drop table if exists piggybank.simulation_task_comments cascade;
drop table if exists piggybank.simulation_tasks cascade;

drop table if exists piggybank.wishes cascade;

-- 旧thread機能の「アーカイブ(close)」に使っていたカラム。
-- simulation_threads テーブル自体はNotes機能が裏側で1件だけ使い続ける。
alter table piggybank.simulation_threads drop column if exists closed_at;
