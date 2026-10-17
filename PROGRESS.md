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
- 待你确认：要不要做第 2 步（Supabase）。需要你有 Supabase 账号。
- 下一步：第 2 步。建 `templates` 表，插入一行假数据再查出来。
