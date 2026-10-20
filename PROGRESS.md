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

## 第 4 步：列表页

- 状态：已完成
- 做了什么：
  - `npm run web` 打开 http://127.0.0.1:3000
  - 页面从 Supabase 读模板，用 120 秒签名链接显示预览图
  - 可以按主题、标签筛选；没有符合的会提示「没有符合的模板」
  - 点「下载」走第 3 步的接口，密钥填在页面上，不写进网页代码
- 浏览器里确认过：两张测试预览都能显示；筛「商务」只剩深色封面，筛「测试」只剩连通测试；不填密钥会被拒绝；填了密钥能下到测试文件

## 第 5 步：入库脚本

- 状态：已完成
- 做了什么：
  - `npm run ingest -- --file 模板.pptx --source-note "许可已自查：个人使用"`
  - 可选 `--title`、`--theme`、`--color-tone`、`--tags`
  - 没有来源说明会停下来，不上传
  - 用 LibreOffice 把第一页画成 PNG，pptx 和预览分别上传到私有桶，再写入 `templates`
  - 用一份自建的测试文稿跑过：页面筛「入库」能看到「入库测试」，预览是第一页，下载下来的是 pptx
- `.pptx` 和预览图没有提交

## 第 6 步：自动打标签

- 状态：还没全部完成。失败时不阻断入库，已经验过。对一张真实预览图打出合理标签，还没验。
- 做了什么：
  - 入库时如果主题、色调或标签有空着的，会把预览图发给多模态接口
  - 接口要兼容 OpenAI 的看图对话。密钥放在 `.env` 的 `VISION_API_KEY`，可选 `VISION_API_BASE` 和 `VISION_MODEL`
  - 你已经手填的主题、色调、标签不会被盖掉
  - 没有密钥，或接口报错、结果读不懂，都会跳过打标签，文件照样入库
  - 用一个连不上的假接口跑过：目录里出现了一行，主题和标签是空的，然后把这行测试数据删掉了
- 没通过的原因：这台机器没有 `VISION_API_KEY`，没法让真实模型看图。
- 待你做：提供一把能看图片的接口密钥（例如 OpenAI，或 Hugging Face 的 token，并把 `VISION_API_BASE` 设为 `https://router.huggingface.co/v1`）。
- 下一步：密钥到位后，对「入库测试」那张预览再打一次标签，看到合理的主题和色调才算第 6 步完成。
