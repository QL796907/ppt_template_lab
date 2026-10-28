# AGENTS.md

给在这个仓库里干活的代理看。用户可见说明在发版时的 `README.md`，这里不写给普通人的安装说明。

## 当前状态

- 第 0 步到第 5 步已完成。入库预览是四页拼图，并包含标题页。第 6 步的打标签代码已接上：没有 `VISION_API_KEY` 或接口失败时仍会入库。用户会自己把密钥写进 `.env`，不要再向聊天索要看图密钥。真实看图还没验。
- 标题页扫描如果进程没正常退出，或输出不是页码，预览会失败。正常退出并打印 0 仍表示没有标题版式。
- 第 7 步还没上线。网站部署到 Cloudflare Workers。用户在自己的电脑上用 `npx cf auth login` 登录后运行 `npm run deploy:web`，不必把账户 API 令牌发到聊天里。账号 ID 用 `R2_ACCOUNT_ID`。域名写进 `WEB_DOMAIN`，且必须已经在同一个 Cloudflare 账号里。还没拿到网址之前不要假装网站已经能打开。看图密钥不要写到 Worker。
- 还没有 Android 工程。
- 还没有发过版，所以还没有面向用户的 `README.md`。第一次发版时再写，并附带 Windows 安装包。网站部署不是这次发版。
- 下一步以 `PROGRESS.md` 为准：等用户在自己的电脑上发布，再把网址记下来。不要跳步。
- CI（`.github/workflows/ci.yml`）在 pull request 和推送到 `main` 时跑：`npm ci`，用 Node 检查 `scripts/` 里 TypeScript 的语法，再跑 `classify:check` 和 `preview:check`，然后 `npm ci` 并构建 `apps/web` 的 Next 版本和 Cloudflare 版本。不跑入库，不部署，也不读 `.env`。
- 入库脚本依赖本机的 `soffice`（LibreOffice）和 `pdftoppm`。CI 机器上没有它们，所以不在 CI 里跑入库。
- AWS SDK 只装在 `apps/web`。入库、下载检查和 R2 连通检查都从 `apps/web/lib/download.ts` 拿 `createR2Client` 和 S3 命令，同一个进程只加载这一份，并带上 R2 要的校验和设置。不要在仓库根目录再装一份 `@aws-sdk`。

## 交付

始终遵守 `.cursor/rules/delivery.mdc`：

- 每完成一轮更改目标，自动提交到 `main`。不要开分支，不要走 PR。
- 每次发版附带 Windows 安装包。第一次发版自动撰写根目录 `README.md`（给 GitHub Release 的下载者看），之后只更新有变化的部分。
- 有 Android 工程时，本机编译通过才算验收完成。没 SDK、Gradle 挂了或环境缺失时必须说明原因，不能假装完成。
- 根目录没有 `AGENTS.md` 就自动创建。每轮结束后，只更新本文件里有变化的部分。
