# 进度

## 第 0 步：仓库与目录

- 状态：已做完，等你确认要不要做第 1 步
- 做了什么：
  - 公开仓库已经在：https://github.com/QL796907/ppt_template_lab
  - 放好目录：`apps/web/`（网站）、`scripts/`（脚本）、`docs/`（设计说明）。现在都只是空位，还没有页面。
  - 放进本指引 `CURSOR_BUILD_GUIDE.md`
  - `.gitignore` 会挡住 `.env`、`.pptx`、`uploads/`、`tmp/`、`previews/`
  - `.env.example` 里只有变量名，没有密钥
- 按仓库约定先不写的：
  - 给下载安装的人看的 `README.md` 留到第一次发版再写。现在还没有可安装的软件，也还没有 Windows 安装包。
- 待你确认：要开始第 1 步吗？第 1 步需要你有 Cloudflare 账号，用来建一个私有的 R2 存储桶。
- 下一步：第 1 步。建私有 R2 桶，写一个小脚本上传一个测试文本，再把它列出来，证明连得上。
