import { createR2Client, ListObjectsV2Command, PutObjectCommand } from "../apps/web/lib/download.ts";

const REQUIRED = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
] as const;

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error("还不能连 R2：.env 里这些是空的：");
  for (const key of missing) console.error(`  - ${key}`);
  console.error("把 .env.example 复制成 .env，填上你自己的 Cloudflare 密钥后再运行。");
  console.error("不要把填好的 .env 提交到 Git。");
  process.exit(1);
}

const bucket = process.env.R2_BUCKET!.trim();
const key = "healthcheck/ping.txt";
const client = createR2Client();

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

// S3 API 主机始终要 SigV4。公开访问走 r2.dev 或自定义域名，
// 对 endpoint 发不签名的 GET 无论桶是否公开都会失败，不能当私有证明。
console.log("第 1 步连通检查通过：密钥能上传，列表里也能看到这个文件。");
