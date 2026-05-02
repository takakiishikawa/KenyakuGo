-- サブスク判定の刷新
-- 旧 subscription_judgments は誤検知（外食・スーパー等が is_subscription=true）を抱えているため drop。
-- 直近30日のトランザクションを毎回見て判定する設計に切り替える。
-- ユーザーが「サブスク認定」「除外」を確定したものだけ user_locked=true でキャッシュ尊重。

drop table if exists kenyakugo.subscription_judgments;

create table if not exists kenyakugo.subscriptions (
  store text primary key,
  category text not null,
  amount bigint not null,
  last_charged_at date not null,
  judgment text not null check (judgment in ('sub', 'not_sub', 'unknown')),
  reasoning text,
  is_active boolean not null default true,
  user_locked boolean not null default false,
  judged_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_active_idx
  on kenyakugo.subscriptions (judgment, is_active);

alter table kenyakugo.subscriptions enable row level security;

create policy "auth all access" on kenyakugo.subscriptions
  for all to authenticated
  using (true)
  with check (true);
