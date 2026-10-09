# 自建云端 PPT 模板库 — Cursor 分步指引

你是编程教练 + 实现助手。用户是人工智能专业学生，Python 基础较少，希望你**一步步指引**完成这个项目，每次只做一小步，确认跑通再继续。用简体中文、通俗、带例子讲解。

## 项目目标

做一个**只给自己用**的 PPT 模板库网站：

- 每个模板是可编辑的 `.pptx`
- 有预览图，按预览挑选，选中后下载
- **文件存在私有对象存储（Cloudflare R2，或兼容的 B2）**
- **元数据存在 Supabase（Postgres）**：名字、主题、色调、标签、预览图路径、文件路径等
- （可选）填多模态 API Key，按预览图自动打主题/色调等标签
- **GitHub 仓库可以公开，但仓库里只放网站/脚本代码，绝不提交 `.pptx` 和预览图二进制**

## 明确不做

- 不要写「全网定期爬取免费模板并自动灌库」的爬虫
- 入库来源只能是：用户确认可个人使用后提供的文件/链接，或用户自己用设计规范生成的模板
- 不要把 R2/Supabase/API 密钥提交进 Git；用 `.env` + `.env.example`

## 推荐技术栈（可微调，但先按这个教）

- 前端：Next.js（或用户更熟的简单静态站 + 少量 API）
- 后端 API：同仓库的 Route Handlers / 小服务
- 对象存储：Cloudflare R2（S3 兼容）
- 数据库：Supabase
- 预览图：上传或入库时用脚本从 `.pptx` 渲第一页 PNG（可用 LibreOffice/`pptx2png` 等，选环境里好装的）
- 语言：TypeScript 优先；若用户强烈只要 Python，可用 FastAPI + 简单前端，但要说明取舍

## 你如何带用户

1. 先复述目标与边界，问清：是否已有 Cloudflare / Supabase / GitHub 账号
2. 给出整体步骤清单（见下），然后**从第 1 步开始，每次只给当前步的命令和检查方法**
3. 用户贴报错时一起看；不要一次丢出整站代码
4. 每完成一步，更新本仓库的 `PROGRESS.md`（没有就创建）

## 分步清单

### 第 0 步：仓库与目录

- 新建公开 GitHub 仓库（例如 `ppt-template-lab`）
- 目录建议：

```
/
  README.md
  CURSOR_BUILD_GUIDE.md   # 本文件
  PROGRESS.md
  .env.example
  .gitignore              # 忽略 .env、*.pptx、uploads/、tmp/
  apps/web/               # 网站
  scripts/                # 上传、生成预览、打标签
  docs/                   # 设计说明
```

- 确认：本地能 `git clone`、推送；提醒用户不要 push 密钥和模板文件

### 第 1 步：Cloudflare R2

- 创建私有 bucket
- 创建 API Token（读写该 bucket）
- 本地 `.env` 写入：`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_ENDPOINT`
- 写一个最小脚本：上传一个测试 txt，再列出对象，证明连通
- **验收**：脚本成功；bucket 保持私有

### 第 2 步：Supabase 表

建议表 `templates` 字段（可调整）：

- `id` uuid pk
- `title` text
- `tags` text[] 或 jsonb
- `theme` text
- `color_tone` text
- `preview_key` text      -- R2 对象键
- `file_key` text         -- R2 对象键
- `source_note` text      -- 来源说明/许可备注
- `created_at` timestamptz default now()

- `.env`：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`（仅服务端）或合适的 anon + RLS 策略
- 个人私用：可用 service role 仅在服务端；若用 anon，务必配 RLS，只允许自己的 auth 用户读写
- **验收**：能 insert 一行假数据并 select 出来

### 第 3 步：签名下载

- API：`GET /api/templates/:id/download` → 校验（至少简单共享密钥或登录）→ 用 R2 预签名 URL 重定向或返回 JSON `{ url }`
- 预签名短有效期（如 60–300 秒）
- **验收**：浏览器不能直接猜公开 URL 下到文件；只有走你的 API 才能下

### 第 4 步：列表页

- 从 Supabase 读列表，展示预览图（预览图可用另一条短签名 URL，或单独的预览 CDN 策略；个人站可先 API 签名）
- 筛选：按 `tags` / `theme`
- 点击「下载」走第 3 步
- **验收**：有 1～2 条测试数据时，页面能看图、能下载

### 第 5 步：入库脚本

- `scripts/ingest.ts`（或 `.py`）：本地路径 → 生成预览图 → 上传 `file_key`/`preview_key` 到 R2 → 写 Supabase
- 支持用户传入 `--source-note "许可已自查：个人使用"`
- **验收**：用户手动放一个自己的 `.pptx`，跑脚本后网站上出现

### 第 6 步：（可选）自动分类

- 读取预览图，调用多模态 API，返回 theme/color_tone/tags，写回数据库
- Key 只放 `.env`
- **验收**：对测试图打出合理标签；失败时不阻断入库

### 第 7 步：部署

- Web 部署到 Vercel / Cloudflare Pages 等
- 环境变量在托管平台配置
- GitHub Actions 可选：仅跑 lint/test，不要在 CI 里放真实密钥上传模板

## 和开发 bot / 云端协作

- 用户若把**代码仓库**交给 Cursor Cloud Agent：可按本文件逐步实现
- 模板二进制仍只走 R2，不进 Git
- 每完成一步在 `PROGRESS.md` 记录：做了什么、待谁确认、下一步是什么

## 现在立刻开始

请先检查用户环境，然后只执行 **第 0 步**，完成后停下来问用户是否继续第 1 步。不要擅自跳到后面步骤。
