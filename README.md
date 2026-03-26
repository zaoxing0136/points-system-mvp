# 多校区学生积分系统 MVP

当前仓库已从“试运营原型”收口到一版可上线的真实数据链路：

- `admin` / `teacher` 账号登录
- 老师端真实积分流水
- 老师端真实徽章行为记录
- 达阈值后的真实徽章解锁
- 后台真实徽章规则与真实结果
- 大屏真实徽章榜

## 技术栈

- 前端：HTML / CSS / JavaScript + Vite
- 数据层：Supabase
- 认证：Supabase Auth
- 数据访问：`@supabase/supabase-js`

## 页面入口

- `login.html`：登录页
- `index.html`：管理首页
- `admin.html`：后台配置页
- `teacher.html`：老师端
- `students.html`：学生主档
- `classes.html`：班级管理
- `display.html`：大屏展示

## Supabase SQL 执行顺序

新环境初始化时，请按下面顺序执行，不要跳步：

1. `supabase/001_init.sql`
2. `supabase/002_seed.sql`
3. `supabase/003_admin_config.sql`
4. `supabase/004_classes_teacher_nullable.sql`
5. `supabase/005_auth_minimal.sql`
6. `supabase/006_user_profiles_phone_nullable.sql`
7. `supabase/007_students_admin_write.sql`
8. `supabase/008_point_ledger_seed_action.sql`
9. `supabase/009_badges_real_chain.sql`

## 当前核心表 / 视图

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
- `badge_definitions`
- `student_badge_events`
- `student_badge_unlocks`

视图：

- `student_points_summary`
- `class_student_roster`
- `student_badge_progress`
- `badge_leaderboard`

## 环境变量

在项目根目录创建 `.env`：

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

说明：

- 前端页面读取 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
- 老师账号脚本或服务端接口会额外用到 `SUPABASE_SERVICE_ROLE_KEY`

## Vercel 部署

仓库已经收口了 Vercel 生产部署所需的最小配置：

- `vercel.json`
- `api/admin/teacher-accounts.js`
- `api/health.js`

当前应继续复用现有 Vercel 项目，不需要新建项目。

上线前请确认生产环境变量至少包含：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

部署完成后可直接用下面两个地址做健康检查：

- `/api/health`
- `/api/admin/teacher-accounts`

## 本地运行

安装依赖：

```bash
npm install
```

启动本地开发：

```bash
npm run dev -- --host 127.0.0.1 --port 4175
```

构建验证：

```bash
npm run build
```

本地验收地址：

- `http://127.0.0.1:4175/login.html`
- `http://127.0.0.1:4175/admin.html`
- `http://127.0.0.1:4175/teacher.html`
- `http://127.0.0.1:4175/display.html`

## 账号模型

### 管理员

- 角色：`admin`
- 可管理段位、积分规则、徽章规则、老师账号
- 可查看真实徽章结果

### 老师

- 角色：`teacher`
- 账号通过 `user_profiles.teacher_id` 绑定到 `teachers.id`
- 只能读取自己名下班级和可操作学生
- 只能在自己班级内写入真实徽章行为记录

## 真实徽章链路

### 1. 徽章规则

数据表：`badge_definitions`

字段：

- `code`
- `name`
- `description`
- `event_label`
- `icon_token`
- `threshold`
- `is_active`
- `sort_order`

默认种子：

- 专注星：专注听课累计 10 次解锁
- 表达星：积极表达累计 10 次解锁
- 协作星：主动帮助累计 10 次解锁
- 坚持星：坚持完成累计 10 次解锁

### 2. 老师行为记录

数据表：`student_badge_events`

每次老师点击行为徽章都会写入：

- `student_id`
- `badge_definition_id`
- `teacher_id`
- `class_id`
- `note`
- `created_at`

### 3. 解锁结果

数据表：`student_badge_unlocks`

规则：

- 阈值来自 `badge_definitions.threshold`
- 插入 `student_badge_events` 后触发自动解锁检查
- 同一学生同一徽章只会生成一条首个解锁记录

### 4. 页面使用

- `admin.html`：真实读取 / 保存 `badge_definitions`
- `teacher.html`：真实写入 `student_badge_events`，实时查看 `student_badge_progress`
- `display.html`：真实读取 `badge_leaderboard`

## 徽章权限模型

### `badge_definitions`

- `admin` 可读写
- `teacher` 只能读取启用中的规则

### `student_badge_events`

- `admin` 可插入和查看
- `teacher` 只能给自己班级、自己可操作学生写记录
- 约束基于 `user_profiles.teacher_id`、`classes.teacher_id`、`class_students`

### `student_badge_unlocks`

- `admin` 可查看全部
- `teacher` 只能查看自己可操作学生的解锁结果

### 视图

- `student_badge_progress`：开启 `security_invoker = true`，跟随真实权限
- `badge_leaderboard`：给后台和大屏提供稳定榜单结果

## 老师端验收动作

1. 登录老师账号并进入 `teacher.html`
2. 选择自己班级
3. 选择一个学生
4. 在“行为徽章”区点击任一徽章动作
5. 查看：
   - 页面内累计次数变化
   - 达阈值后出现解锁状态
   - 刷新后仍保留

## 后台验收动作

1. 登录管理员并进入 `admin.html`
2. 查看“徽章规则”表
3. 修改阈值 / 启停 / 排序后保存
4. 刷新页面确认规则仍在
5. 查看“真实徽章结果”表是否出现老师刚才写入的累计与解锁结果

## 大屏验收动作

1. 打开 `display.html`
2. 查看“徽章榜”
3. 榜单字段应来自真实数据：
   - 已解锁徽章数
   - 行为记录数
   - 已解锁徽章名称

## 试运营发布清单

发版前必须确认：

- SQL 已执行到 `009_badges_real_chain.sql`
- `admin` / `teacher` 账号均可登录
- 老师端加分、补录、兑换、徽章记录均可写入真实数据库
- 后台修改徽章规则后刷新不丢失
- 大屏徽章榜不再使用占位算法
- `npm run build` 通过
- 目标环境已部署老师账号接口 `/api/admin/teacher-accounts`
- Vercel 生产环境已补齐 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`

## 发布文档

- [试运行上线清单](/D:/软件产品开发/03月积分系统MVP/docs/trial-launch-checklist.md)

## 备注

- `display.html` 当前设计为公开展示页，所以 `badge_leaderboard` 允许大屏读取
- `teacher.html` 的 `file://` 直开模式仍然只用于静态预览，不用于真实验收
