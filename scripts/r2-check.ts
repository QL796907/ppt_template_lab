import { readFileSync } from "node:fs";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const REQUIRED = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
] as const;

loadEnvFile(".env");

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error("还不能连 R2：.env 里这些是空的：");
  for (const key of missing) console.error(`  - ${key}`);
  console.error("把 .env.example 复制成 .env，填上你自己的 Cloudflare 密钥后再运行。");
  console.error("不要把填好的 .env 提交到 Git。");
  process.exit(1);
}

const bucket = process.env.R2_BUCKET!.trim();
const endpoint = process.env.R2_ENDPOINT!.trim().replace(/\/$/, "");
const key = "healthcheck/ping.txt";

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
  },
});

const body = `r2 ok ${new Date().toISOString()}\n`;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
} catch (error) {
  console.error("上传失败。请核对桶名、Endpoint 和密钥是否属于同一个 Cloudflare 账号。");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`已上传：${key}`);

let listed;
try {
  listed = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "healthcheck/",
    }),
  );
} catch (error) {
  console.error("文件上传了，但列出对象失败。");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
const names = (listed.Contents ?? []).map((item) => item.Key);
if (!names.includes(key)) {
  console.error("上传之后没有在列表里看到这个文件。");
  process.exit(1);
}
console.log("列表里能看到：");
for (const name of names) console.log(`  - ${name}`);

const anonymous = await fetch(`${endpoint}/${bucket}/${key}`);
if (anonymous.ok) {
  console.error("这个桶现在像是公开的：不带密钥也能下载。请在 Cloudflare 里关掉公开访问。");
  process.exit(1);
}
console.log(`不带密钥下载被拒绝（HTTP ${anonymous.status}）。桶仍然是私有的。`);
console.log("第 1 步连通检查通过。");

function loadEnvFile(path: string) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  }
}
