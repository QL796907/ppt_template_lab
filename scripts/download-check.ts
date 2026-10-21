import { createR2Client, DOWNLOAD_EXPIRES_SECONDS, GetObjectCommand } from "../apps/web/lib/download.ts";
import { startDownloadServer } from "./download-server.ts";

const base = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!base || !serviceKey) {
  console.error("还不能检查下载：.env 里缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。");
  process.exit(1);
}

const listed = await fetch(
  `${base}/rest/v1/templates?select=id,file_key&file_key=not.is.null&limit=1`,
  { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
);
if (!listed.ok) {
  console.error(`读取模板失败（HTTP ${listed.status}）。`);
  process.exit(1);
}
const templates = (await listed.json()) as Array<{ id: string; file_key: string }>;
const template = templates[0];
if (!template?.id || !template.file_key) {
  console.error("目录里还没有带文件路径的模板，无法检查下载。");
  process.exit(1);
}

const client = createR2Client();
const object = await client.send(
  new GetObjectCommand({
    Bucket: process.env.R2_BUCKET!.trim(),
    Key: template.file_key,
  }),
);
const expected = Buffer.from(await object.Body!.transformToByteArray());

const server = await startDownloadServer(0);
const endpoint = process.env.R2_ENDPOINT!.trim().replace(/\/$/, "");
const bucket = process.env.R2_BUCKET!.trim();
try {
  const path = `/api/templates/${template.id}/download`;
  const blocked = await fetch(`http://127.0.0.1:${server.port}${path}`);
  if (blocked.status !== 401) {
    console.error(`不带密钥时应该拒绝，实际是 HTTP ${blocked.status}。`);
    process.exit(1);
  }
  console.log("不带密钥调用接口：被拒绝（HTTP 401）。");

  const opened = await fetch(`http://127.0.0.1:${server.port}${path}`, {
    headers: { Authorization: `Bearer ${process.env.DOWNLOAD_SECRET}` },
  });
  if (!opened.ok) {
    console.error(`带密钥调用接口失败（HTTP ${opened.status}）。`);
    console.error(await opened.text());
    process.exit(1);
  }
  const payload = (await opened.json()) as { url?: string; expires_in?: number };
  if (!payload.url || payload.expires_in !== DOWNLOAD_EXPIRES_SECONDS) {
    console.error("接口没有返回有效期为 120 秒的下载链接。");
    process.exit(1);
  }
  const signed = new URL(payload.url);
  if (signed.searchParams.get("X-Amz-Expires") !== String(DOWNLOAD_EXPIRES_SECONDS)) {
    console.error("链接上的有效期不是 120 秒。");
    process.exit(1);
  }
  const downloaded = await fetch(payload.url);
  const body = Buffer.from(await downloaded.arrayBuffer());
  if (!downloaded.ok || !body.equals(expected)) {
    console.error(`签名链接没有下到原文件（HTTP ${downloaded.status}）。`);
    process.exit(1);
  }
  console.log("带密钥拿到的链接：能下载，120 秒内有效。");

  signed.search = "";
  const guessedUrls = [
    signed.toString(),
    `${endpoint}/${bucket}/${template.file_key}`,
    `https://${bucket}.r2.dev/${template.file_key}`,
  ];
  for (const url of guessedUrls) {
    let ok = false;
    try {
      const response = await fetch(url);
      const guess = Buffer.from(await response.arrayBuffer());
      ok = response.ok && guess.equals(expected);
    } catch {
      ok = false;
    }
    if (ok) {
      console.error("不带签名也能下到文件，桶不像是私有的。");
      process.exit(1);
    }
  }
  console.log("猜公开地址、或去掉签名：都下不到文件。");
  console.log("第 3 步签名下载检查通过。");
} finally {
  await server.close();
}
