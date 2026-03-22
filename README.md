# 多校区学生积分管理系统 MVP

当前版本已经从假数据原型升级为 Supabase MVP，并补上了最小登录体系：

- `admin` / `teacher` 两类账号
- 账号名 + 密码登录
- `teacher` 首次登录强制改密
- `teacher` 登录后只读取自己名下班级和学生

## 当前技术栈

- 前端：HTML / CSS / JavaScript + Vite
- 后端：Supabase
- 数据访问：`@supabase/supabase-js`
- 认证：Supabase Auth（内部使用账号名映射到 email/password）

## 项目结构

- `index.html`：管理入口首页（需要 admin 登录）
- `login.html`：登录页
- `teacher.html`：响应式老师端
- `display.html`：大屏展示页
- `admin.html`：管理配置页
- `students.html`：学生管理 / 学生导入页
- `classes.html`：班级管理 / 搜索加人页
- `assets/supabase-client.js`：Supabase client 初始化
- `assets/supabase-service.js`：Supabase 数据读写封装
- `assets/auth.js`：登录态、角色守卫、退出登录、首次改密
- `assets/shared-ui.js`：共享展示与段位工具
- `supabase/001_init.sql`：基础业务表初始化
- `supabase/002_seed.sql`：基础种子数据
- `supabase/003_admin_config.sql`：段位配置表 `level_tiers`
- `supabase/004_classes_teacher_nullable.sql`：允许 `classes.teacher_id` 为空
- `supabase/005_auth_minimal.sql`：最小账号映射表 `user_profiles`

## 1. 在 Supabase 中执行 SQL

先创建一个新的 Supabase 项目，然后在 SQL Editor 依次执行：

1. `supabase/001_init.sql`
2. `supabase/002_seed.sql`
3. `supabase/003_admin_config.sql`
4. `supabase/005_auth_minimal.sql`

可选：

- 如果你希望班级可以暂时不分配老师，再执行 `supabase/004_classes_teacher_nullable.sql`

### 当前会创建的核心表 / 视图

业务表：

- `campuses`
- `subjects`
- `teachers`
- `students`
- `classes`
- `class_students`
- `point_rules`
- `point_ledger`
- `level_tiers`
- `user_profiles`

视图：

- `student_points_summary`
- `class_student_roster`

## 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

说明：

- 前端页面当前实际读取的是 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
- 本地一次性创建测试账号脚本会额外读取 `SUPABASE_SERVICE_ROLE_KEY`
- `vite.config.js` 已放开前端页面需要的环境变量

## 3. 本地运行

安装依赖：

```bash
npm install
```

启动本地开发：

```bash
npm run dev
```

构建验证：

```bash
npm run build
```

本地一次性创建测试账号：

```bash
npm run account:create -- --help
```

启动后可访问：

- `http://localhost:5173/login.html`
- `http://localhost:5173/display.html`

## 4. 先配置 Supabase Auth

当前登录方式已切换为：账号名 + 密码。

你不需要启用 `Phone` provider，也不需要配置 Twilio。当前做法是：

1. 账号名会在脚本里转换成内部 email，例如 `cls@accounts.points-mvp.local`
2. 登录页会把账号名自动映射到这个内部 email
3. 密码仍然走 Supabase Auth 的 email/password 登录

说明：

- 当前不做短信 OTP 登录，也不依赖短信服务商
- 当前不开放老师自注册
- 第一个管理员账号需要手工创建
- 老师账号也由管理员 / 系统拥有者手工创建

## 4.1 本地一次性创建测试账号

如果你当前只是要在本地 / 测试环境里快速打通登录链路，不想每次都去 Supabase Dashboard 手工点，可以直接用这个脚本：

创建 admin：

```bash
npm run account:create -- --role admin --login-name admin --phone 13900009999 --password Admin123456 --display-name 系统管理员
```

创建 teacher：

```bash
npm run account:create -- --role teacher --login-name cls --phone 13880010001 --display-name 陈老师 --teacher-id <teachers.id>
```

说明：

- `teacher` 不传 `--password` 时，默认密码就是 `666666`
- `teacher` 默认 `must_change_password = true`
- `admin` 建议显式传入 `--password`
- 脚本会自动：
  - 创建或更新 Supabase Auth 用户
  - upsert `public.user_profiles`
- 这个脚本只用于当前本地 / 测试环境，不是最终正式后台账号管理方案
## 5. 如何手工创建第一个 admin

### 第一步：在 Supabase Auth 创建账号

到 `Authentication -> Users` 手工新增一个 email 用户：

- `email`：建议使用内部账号邮箱，例如 `admin@accounts.points-mvp.local`
- `password`：自定义管理员密码

创建后记下这个 Auth 用户的 `id`。

### 第二步：在 `user_profiles` 里插入映射

```sql
insert into public.user_profiles (
  id,
  role,
  phone,
  display_name,
  teacher_id,
  is_active,
  must_change_password
) values (
  '<auth_user_id>',
  'admin',
  '13900009999',
  '系统管理员',
  null,
  true,
  false
);
```

说明：

- `id` 必须等于 `auth.users.id`
- `phone` 是业务联系方式，不参与登录
- 第一个 admin 一般不需要首次改密，所以 `must_change_password = false`

## 6. 如何手工创建一个 teacher

### 第一步：确认 `teachers` 表里已有老师记录

先查老师表：

```sql
select id, name, display_name, phone, campus_id, status
from public.teachers
order by created_at asc;
```

拿到要绑定的 `teachers.id`。

### 第二步：在 Supabase Auth 创建老师账号

到 `Authentication -> Users` 手工新增一个 email 用户：

- `email`：建议使用内部账号邮箱，例如 `cls@accounts.points-mvp.local`
- `password`：`666666`

创建后记下 Auth 用户 `id`。

### 第三步：插入 `user_profiles`

```sql
insert into public.user_profiles (
  id,
  role,
  phone,
  display_name,
  teacher_id,
  is_active,
  must_change_password
) values (
  '<auth_user_id>',
  'teacher',
  '13880010001',
  '王老师',
  '<teacher_id>',
  true,
  true
);
```

说明：

- 老师默认初始密码就是 `666666`
- `must_change_password = true`，所以老师首次登录后会先看到改密页
- `teacher_id` 必须绑定到 `public.teachers.id`

## 7. `user_profiles` 的作用

`user_profiles` 是当前最小账号映射层，用来把 Supabase Auth 用户映射到业务角色。

字段：

- `id`：对应 `auth.users.id`
- `role`：`admin` / `teacher`
- `phone`：业务联系方式
- `display_name`：页面展示名称
- `teacher_id`：老师账号时绑定 `teachers.id`
- `is_active`：账号是否可用
- `must_change_password`：是否首次登录必须改密
- `created_at`：创建时间

它的作用是：

- 登录后先找到当前账号属于什么角色
- 如果是 `teacher`，再找到对应的 `teachers.id`
- 再按 `teacher_id` 去限制老师页能看到的班级和学生

## 8. 当前已实现的真实功能

### 登录 / 权限

- `login.html` 已接入 Supabase Auth 账号名 + 密码登录
- 登录成功后：
  - `admin` 进入 `index.html`
  - `teacher` 进入 `teacher.html`
- `teacher` 首次登录会先要求修改密码
- `admin` 页面入口：`index / admin / students / classes`
- `teacher` 页面入口：`teacher`
- `display.html` 当前保持公开访问

### 老师页 `teacher.html`

已接入真实数据库读取：

- 读取积分规则 `point_rules`
- 读取班级学生 `class_student_roster`
- 读取最近积分流水 `point_ledger`
- 读取老师自己的班级列表（teacher 角色时只查 `teacher_id = 当前老师`）

已接入真实数据库写入：

- 单个学生加分写入 `point_ledger`
- 整班 `+1` 批量写入 `point_ledger`
- 新建班级写入 `classes`
- 搜索学生并加入班级，写入 `class_students`

### 大屏页 `display.html`

已接入真实数据库读取：

- 总分榜：`student_points_summary.total_points`
- 进步榜：`student_points_summary.progress_7d`

当前仍为占位：

- 徽章榜

### 管理页 `admin.html`

已接入真实数据库读写：

- `level_tiers`
- `point_rules`

### 学生管理页 `students.html`

已接入真实数据库读写：

- 学生主档列表：`students`
- 手动新增学生：写入 `students`
- CSV 导入预览后批量写入 `students`
- 疑似重复提醒（只提醒，不合并）

### 班级管理页 `classes.html`

已接入真实数据库读写：

- 班级列表：`classes` + `campuses` + `subjects` + `teachers` + `class_students`
- 新建班级：写入 `classes`
- 搜索已有学生并加入班级：写入 `class_students`

## 9. 老师权限 v1 是如何生效的

当前阶段只做“前端 + 查询层最小限制”，还没有做完整 RLS。

具体做法：

- 登录后先读 `user_profiles`
- 如果 `role = teacher`，取出 `teacher_id`
- 老师页读取班级时，会自动带上 `teacher_id = 当前老师`
- 因为老师页当前学生列表来自当前班级的 `class_student_roster`
- 所以老师最终只能看到自己班级下的学生
- 如果老师手动打开管理页、学生页、班级页，会被前端重定向回老师页

## 10. 如何人工验证老师权限是否生效

建议按下面顺序验证：

1. 用 admin 账号登录 `login.html`
2. 打开 `classes.html`，确认系统中至少有两个不同老师名下的班级
3. 再用某个 teacher 账号登录
4. 登录后第一次会先提示修改密码
5. 改密完成后进入 `teacher.html`
6. 检查班级下拉：
   - 只能看到绑定到自己 `teacher_id` 的班级
   - 不应出现别的老师班级
7. 选择班级后检查学生列表：
   - 只能看到该班级里的学生
8. 再手动访问：
   - `index.html`
   - `admin.html`
   - `students.html`
   - `classes.html`
9. teacher 角色应被重定向回 `teacher.html`

## 11. 当前仍未实现的内容

- 短信验证码登录
- 老师自注册
- 忘记密码流程
- MFA
- 完整 RLS 策略
- 复杂账号管理后台
- 徽章真实数据表 / 徽章榜真实读取
- 学生主档真正的合并流程
- 家长端 / 小程序

## 12. 后续建议

建议下一阶段按这个顺序继续：

1. 给 `user_profiles`、`classes`、`class_students`、`point_ledger` 补最小 RLS
2. 增加管理员创建老师账号的后台入口
3. 把段位显示逻辑改为真实读取 `level_tiers`
4. 补徽章真实表和徽章榜
5. 再做忘记密码和更完整的账号维护

## 13. 当前验证情况

已完成：

- `node --check assets/auth.js`
- `node --check assets/login.js`
- `node --check assets/teacher.js`
- `node --check assets/students.js`
- `node --check assets/classes.js`
- `npm run build`

未完成：

- 我没有替你在 Supabase Dashboard 手工创建真实 Auth 用户
- 我没有替你在真实浏览器里完成一次 admin / teacher 登录点测
- 当前权限仍不是后端 RLS 级别的强限制