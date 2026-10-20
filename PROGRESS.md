# 进度

## 第 0 步：仓库与目录

- 状态：已做完。你已确认继续第 1 步。
- 做了什么：
  - 公开仓库已经在：https://github.com/QL796907/ppt_template_lab
  - 放好目录：`apps/web/`（网站）、`scripts/`（脚本）、`docs/`（设计说明）。现在都只是空位，还没有页面。
  - 放进本指引 `CURSOR_BUILD_GUIDE.md`
  - `.gitignore` 会挡住 `.env`、`.pptx`、`uploads/`、`tmp/`、`previews/`
  - `.env.example` 里只有变量名，没有密钥
- 按仓库约定先不写的：
  - 给下载安装的人看的 `README.md` 留到第一次发版再写。现在还没有可安装的软件，也还没有 Windows 安装包。

## 第 1 步：Cloudflare R2

- 状态：已完成
- 做了什么：
  - 私有桶 `ppt-template`（公开访问保持禁用）
  - `scripts/r2-check.ts`（`npm run r2:check`）上传 `healthcheck/ping.txt`，并确认列表里能看到它
  - 密钥只在本机 `.env`，没有提交

## 第 2 步：Supabase 表

- 状态：已完成
- 做了什么：
  - 在已有的 Supabase 项目里建了表 `templates`（名字、标签、主题、色调、预览图路径、文件路径、来源说明、创建时间）
  - 表开了行级安全，没有放开匿名访问。服务端的 service_role 密钥可以读写
  - `npm run supabase:check` 写入一行「连通测试」，再按 id 读了回来
  - 项目网址和密钥只在本机 `.env`，没有提交

## 第 3 步：签名下载

- 状态：已完成
- 做了什么：
  - `npm run download:server` 提供 `GET /api/templates/<模板id>/download`
  - 请求头要带 `Authorization: Bearer <DOWNLOAD_SECRET>`，否则返回 401
  - 通过后返回一个 120 秒内有效的 R2 签名链接（JSON 里的 `url`）
  - `npm run download:check` 已确认：不带密钥被拒绝；带密钥能下到原文件；猜公开地址或去掉签名都下不到
- 密钥只在本机 `.env`，没有提交
- 待你确认：要不要做第 4 步（列表页）。从目录读模板，看预览，点下载走这一步的接口。
- 下一步：第 4 步。
