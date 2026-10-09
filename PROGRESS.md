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
- 下一步：第 1 步的脚本已经写好，连通验收还没过。

## 第 1 步：Cloudflare R2

- 状态：还没完成。脚本在仓库里，但没有连上你的私有桶。
- 做了什么：
  - 新增 `scripts/r2-check.ts`。它会上传 `healthcheck/ping.txt`，再列出这个文件，然后不带密钥去下载，确认被拒绝。
  - 运行命令：`npm run r2:check`
  - 没配密钥时脚本会停下来，并列出缺哪些变量。用假地址试了一次，上传失败并退出，没有误报成功。
- 没通过的原因：这台机器没有 Cloudflare 账号，也没有 `.env`。建不了私有桶，真实上传也跑不了。不能把这一步当成做完。
- 待你做：在 Cloudflare 建一个私有 R2 桶和读写令牌，把下面 5 个值填进 `.env`（不要提交）：
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_ENDPOINT`（一般是 `https://账号ID.r2.cloudflarestorage.com`）
- 下一步：密钥到位后重新跑 `npm run r2:check`。看到「第 1 步连通检查通过」才算完成，然后再做第 2 步。
