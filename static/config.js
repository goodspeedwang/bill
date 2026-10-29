// ============================================================
//  部署前请修改以下两项（anon key 本就是公开设计，放前端安全）
// ============================================================
const SUPABASE_URL = "https://hbrexhinhcqcczehtjyz.supabase.co"; //修正 Supabase URL 去掉多余的 /rest/v1/ 路径
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhicmV4aGluaGNxY2N6ZWh0anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMjM4NDEsImV4cCI6MjEwODc5OTg0MX0.Wnj5jVlmy-KJP2UhMtbwAjaOhVihk0021X-YV_tgqbg";

// ------------------------------------------------------------
//  安全模型（方案 B：Supabase Auth 真账户 + RLS 守门）：
//  - 匿名（anon key）读不到任何数据；
//  - 只有登录后的账户（authenticated 角色）才能读写；
//  - 单本账：所有登录用户共享同一份数据（如需按人隔离，见底部备注）。
//
//  在 Supabase 后台 SQL Editor 执行一次（幂等，可重复跑）：
//  create table if not exists public.transactions (
//    id uuid not null default gen_random_uuid(),
//    amount numeric(12,2) not null,
//    category character varying(10) not null,
//    description text null,
//    transaction_date date not null default CURRENT_DATE,
//    last_editor character varying(255) null,
//    created_at timestamptz null default now(),
//    constraint transactions_pkey primary key (id)
//  );
//  alter table public.transactions enable row level security;
//  drop policy if exists anon_all on public.transactions;
//  drop policy if exists authenticated_all on public.transactions;
//  create policy "authenticated_all" on public.transactions
//    for all to authenticated
//    using (auth.uid() is not null)
//    with check (auth.uid() is not null);
//
//  用户由你在 Supabase 后台 Authentication → Users 手动添加（应用内无注册页）。
//  Providers → Email 可关闭 "Confirm email"，手动建的用户即可直接登录。
//
//  （如需“每人只看自己的账”：给表加 user_id uuid 默认值 auth.uid()，
//   把上面策略改成 USING (user_id = auth.uid())。）
// ============================================================
