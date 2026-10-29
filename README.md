# 记账本

一个纯静态的前端记账应用，使用 [Supabase](https://supabase.com/) 提供邮箱密码登录与数据持久化。无需后端，部署即可用。

线上地址：[https://bill.4480911.xyz/](https://bill.4480911.xyz/)

## 功能

- 邮箱 + 密码登录（账户由后台手动创建）
- 按月份浏览账单，支持上 / 下月切换
- 查看本月合计金额
- 新增、编辑、删除每一笔收支记录
- 预设分类：餐饮、交通、购物、居住、娱乐、医疗、教育、工资、其他

## 技术栈

- 原生 HTML / CSS / JavaScript（无构建步骤）
- Supabase Auth（邮箱密码）
- Supabase Postgres 表 + 行级安全（RLS）

## 文件结构

| 文件 | 说明 |
| --- | --- |
| `index.html` | 页面结构（登录框 + 主应用） |
| `static/` | 静态资源目录 |
| `static/styles.css` | 样式 |
| `static/app.js` | 认证、月份导航、记录的增删改与渲染 |
| `static/config.js` | Supabase 连接配置与安全模型说明（需自行修改） |
| `favicon.ico` | 站点图标（金色五角星） |
| `CNAME` | 自定义域名（GitHub Pages 部署用） |

## 本地运行

直接以静态文件方式打开即可，但建议用本地服务器避免浏览器限制：

```bash
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

或使用任意静态服务器（如 `npx serve`）。

## 配置 Supabase

1. 新建 Supabase 项目。
2. 打开 **SQL Editor**，执行 `config.js` 注释中的建表与 RLS 脚本（幂等，可重复运行）：

   ```sql
   create table if not exists public.transactions (
     id uuid not null default gen_random_uuid(),
     amount numeric(12,2) not null,
     category character varying(10) not null,
     description text null,
     transaction_date date not null default CURRENT_DATE,
     created_at timestamptz null default now(),
     constraint transactions_pkey primary key (id)
   );
   alter table public.transactions enable row level security;
   drop policy if exists anon_all on public.transactions;
   drop policy if exists authenticated_all on public.transactions;
   create policy "authenticated_all" on public.transactions
     for all to authenticated
     using (auth.uid() is not null)
     with check (auth.uid() is not null);
   ```

3. 在 **Authentication → Users** 手动添加用户（应用内无注册页）。
   可在 **Providers → Email** 关闭 “Confirm email”，让手动创建的用户直接登录。
4. 修改 `config.js` 中的 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY` 为你项目的实际值。

## 安全模型

- 匿名（anon key）读不到任何数据；
- 仅登录后的账户（authenticated 角色）可读写；
- 默认单本账：所有登录用户共享同一份数据。

如需「每人只看自己的账」，给表加 `user_id uuid default auth.uid()`，
并将策略改为 `USING (user_id = auth.uid())`（详见 `config.js` 注释）。

## 部署

本仓库包含一个 `CNAME`（指向 `bill.4480911.xyz`），可直接作为 GitHub Pages 的自定义域名部署。
将仓库内容推送到 GitHub 并在 Pages 设置中启用即可。