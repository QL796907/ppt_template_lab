import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client } from "../apps/web/lib/download.ts";
import { classifyPreview, mergeLabels } from "./classify.ts";

const file = option("--file");
const sourceNote = option("--source-note");
const title = option("--title") || (file ? basename(file, extname(file)) : "");
const theme = option("--theme");
const colorTone = option("--color-tone");
const tags = option("--tags")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);

if (!file || !sourceNote) {
  console.error('用法：npm run ingest -- --file 模板.pptx --source-note "许可已自查：个人使用"');
  console.error("可选：--title 名字 --theme 主题 --color-tone 色调 --tags 标签1,标签2");
  console.error("没有来源说明就不要入库。只放你确认可以自己使用的文件。");
  process.exit(1);
}

const path = resolve(file);
if (extname(path).toLowerCase() !== ".pptx") {
  console.error("只能入库 .pptx 文件。");
  process.exit(1);
}
try {
  if (!statSync(path).isFile()) throw new Error("not a file");
} catch {
  console.error(`找不到文件：${path}`);
  process.exit(1);
}

const id = randomUUID();
const preview = renderFirstSlide(path);
const pptx = readFileSync(path);
const fileKey = `files/${id}.pptx`;
const previewKey = `previews/${id}.png`;
const client = createR2Client();
const bucket = required("R2_BUCKET");

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    Body: pptx,
    ContentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  }),
);
await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: previewKey,
    Body: preview,
    ContentType: "image/png",
  }),
);

const auto =
  theme && colorTone && tags.length > 0 ? null : await classifyPreview(preview);
const labels = mergeLabels({ theme, colorTone, tags }, auto);

const inserted = await fetch(`${required("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/templates`, {
  method: "POST",
  headers: {
    apikey: required("SUPABASE_SERVICE_ROLE_KEY"),
    Authorization: `Bearer ${required("SUPABASE_SERVICE_ROLE_KEY")}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    id,
    title,
    tags: labels.tags,
    theme: labels.theme,
    color_tone: labels.colorTone,
    preview_key: previewKey,
    file_key: fileKey,
    source_note: sourceNote,
  }),
});

if (!inserted.ok) {
  console.error(`文件已上传，但写入目录失败（HTTP ${inserted.status}）。`);
  console.error(await inserted.text());
  process.exit(1);
}

console.log(`已入库：${title}`);
console.log(`编号：${id}`);
if (labels.theme || labels.colorTone || labels.tags.length > 0) {
  console.log(
    `标签：主题 ${labels.theme || "未填"}，色调 ${labels.colorTone || "未填"}，标签 ${labels.tags.join("、") || "未填"}`,
  );
}
console.log("刷新 http://127.0.0.1:3000 就能看到。网站要先用 npm run web 开着。");

function renderFirstSlide(pptxPath: string) {
  const soffice = commandPath("soffice") ?? commandPath("libreoffice");
  const pdftoppm = commandPath("pdftoppm");
  if (!soffice || !pdftoppm) {
    console.error("这台机器还不能把幻灯片画成图片。需要安装 LibreOffice 和 poppler-utils。");
    process.exit(1);
  }
  const dir = mkdtempSync(join(tmpdir(), "ppt-preview-"));
  try {
    const profile = join(dir, "profile");
    const converted = spawnSync(
      soffice,
      [
        "--headless",
        "--norestore",
        "--nolockcheck",
        `-env:UserInstallation=file://${profile}`,
        "--convert-to",
        "pdf",
        "--outdir",
        dir,
        pptxPath,
      ],
      { encoding: "utf8" },
    );
    if (converted.status !== 0) {
      console.error("生成预览失败。LibreOffice 没有把这份文稿转成图片。");
      console.error((converted.stderr || converted.stdout || "").trim());
      process.exit(1);
    }
    const pdf = join(dir, `${basename(pptxPath, extname(pptxPath))}.pdf`);
    const pngBase = join(dir, "slide");
    const rendered = spawnSync(pdftoppm, ["-png", "-f", "1", "-l", "1", "-singlefile", pdf, pngBase], {
      encoding: "utf8",
    });
    if (rendered.status !== 0) {
      console.error("生成预览失败。第一页没有变成 PNG。");
      console.error((rendered.stderr || rendered.stdout || "").trim());
      process.exit(1);
    }
    return readFileSync(`${pngBase}.png`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function option(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1]?.trim() ?? "";
}

function commandPath(name: string) {
  const found = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" });
  const path = found.stdout.trim();
  return found.status === 0 && path ? path : null;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`还不能入库：.env 里缺少 ${name}`);
    process.exit(1);
  }
  return value;
}
