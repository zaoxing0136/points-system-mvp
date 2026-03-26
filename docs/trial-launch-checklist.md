# 试运行上线收口清单

## 1. 数据库基线

### 新环境初始化

按顺序执行以下 SQL：

1. `supabase/001_init.sql`
2. `supabase/002_seed.sql`
3. `supabase/003_admin_config.sql`
4. `supabase/004_classes_teacher_nullable.sql`
5. `supabase/005_auth_minimal.sql`
6. `supabase/006_user_profiles_phone_nullable.sql`
7. `supabase/007_students_admin_write.sql`
8. `supabase/008_point_ledger_seed_action.sql`
9. `supabase/009_badges_real_chain.sql`

### 老环境增量升级

如果线上已经能跑登录、学生、班级和积分，只缺真实徽章链路，则至少补执行：

1. `supabase/009_badges_real_chain.sql`

执行后请确认以下对象存在：

- `badge_definitions`
- `student_badge_events`
- `student_badge_unlocks`
- `student_badge_progress`
- `badge_leaderboard`

## 2. Vercel 部署基线

仓库内已经收口：

- `vercel.json`
- `api/admin/teacher-accounts.js`
- `api/health.js`

Vercel 生产环境必须配置：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. 线上验收入口

- `/login.html`
- `/admin.html`
- `/teacher.html`
- `/students.html`
- `/classes.html`
- `/display.html`
- `/api/health`
- `/api/admin/teacher-accounts`

## 4. 核心门禁

- 管理员登录成功
- 老师登录成功
- 首次改密成功
- 建班成功
- 搜索学生并加入班级成功
- 单人加分成功
- 整班 +1 成功
- 补录积分成功
- 后台读取并保存真实徽章规则成功
- 老师行为记录成功
- 达阈值真实解锁成功
- 大屏徽章榜显示真实数据
- `/api/admin/teacher-accounts` 在生产环境返回 JSON，而不是 404 / HTML 错页
