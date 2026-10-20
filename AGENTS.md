# AGENTS.md

给在这个仓库里干活的代理看。用户可见说明在发版时的 `README.md`，这里不写给普通人的安装说明。

## 当前状态

- 第 0 步到第 5 步已完成。入库预览是四页拼图，并包含标题页。第 6 步的打标签代码已接上：没有 `VISION_API_KEY` 或接口失败时仍会入库。用户会自己把密钥写进 `.env`，不要再向聊天索要密钥。真实看图还没验。
- 还没有 Android 工程。
- 还没有发过版，所以还没有面向用户的 `README.md`。第一次发版时再写，并附带 Windows 安装包。
- 下一步以 `PROGRESS.md` 为准：等用户确认后再做第 7 步（部署）。不要跳步。
- CI（`.github/workflows/ci.yml`）在 pull request 和推送到 `main` 时跑：`npm ci`，再用 Node 检查 `scripts/` 里 TypeScript 的语法。不跑入库、不构建 `apps/web`，也不读 `.env`。
- 入库脚本依赖本机的 `soffice`（LibreOffice）和 `pdftoppm`。CI 机器上没有它们，所以不在 CI 里跑入库。

## 交付

始终遵守 `.cursor/rules/delivery.mdc`：

- 每完成一轮更改目标，自动提交到 `main`。不要开分支，不要走 PR。
- 每次发版附带 Windows 安装包。第一次发版自动撰写根目录 `README.md`（给 GitHub Release 的下载者看），之后只更新有变化的部分。
- 有 Android 工程时，本机编译通过才算验收完成。没 SDK、Gradle 挂了或环境缺失时必须说明原因，不能假装完成。
- 根目录没有 `AGENTS.md` 就自动创建。每轮结束后，只更新本文件里有变化的部分。
