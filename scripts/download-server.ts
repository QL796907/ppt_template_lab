import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const DOWNLOAD_EXPIRES_SECONDS = 120;

const REQUIRED = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DOWNLOAD_SECRET",
] as const;

export function assertDownloadEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error("还不能启动下载接口：.env 里这些是空的：");
    for (const key of missing) console.error(`  - ${key}`);
    console.error("不要把填好的 .env 提交到 Git。");
    process.exit(1);
  }
}

export function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!.trim().replace(/\/$/, ""),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function authorized(req: IncomingMessage) {
  const header = req.headers.authorization ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const expected = process.env.DOWNLOAD_SECRET!.trim();
  const provided = Buffer.from(given);
  const wanted = Buffer.from(expected);
  if (provided.length === 0 || provided.length !== wanted.length) return false;
  return timingSafeEqual(provided, wanted);
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function fileKeyFor(id: string) {
  const base = process.env.SUPABASE_URL!.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const response = await fetch(
    `${base}/rest/v1/templates?id=eq.${encodeURIComponent(id)}&select=file_key`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!response.ok) {
    throw new Error(`读取目录失败（HTTP ${response.status}）`);
  }
  const rows = (await response.json()) as Array<{ file_key: string | null }>;
  const fileKey = rows[0]?.file_key?.trim() ?? "";
  return fileKey || null;
}

export function startDownloadServer(port = 0) {
  assertDownloadEnv();
  const client = createR2Client();
  const bucket = process.env.R2_BUCKET!.trim();
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
      const match = /^\/api\/templates\/([^/]+)\/download$/.exec(path);
      if (req.method !== "GET" || !match) {
        send(res, 404, { error: "没有这个接口" });
        return;
      }
      if (!authorized(req)) {
        send(res, 401, { error: "需要下载密钥" });
        return;
      }
      const id = decodeURIComponent(match[1]);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        send(res, 400, { error: "模板编号格式不对" });
        return;
      }
      const fileKey = await fileKeyFor(id);
      if (!fileKey) {
        send(res, 404, { error: "没有这个模板，或还没有文件" });
        return;
      }
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: fileKey }),
        { expiresIn: DOWNLOAD_EXPIRES_SECONDS },
      );
      send(res, 200, { url, expires_in: DOWNLOAD_EXPIRES_SECONDS });
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      send(res, 500, { error: "生成下载链接失败" });
    }
  });

  return new Promise<{ port: number; close: () => Promise<void> }>((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actual = typeof address === "object" && address ? address.port : port;
      resolve({
        port: actual,
        close: () =>
          new Promise((done, reject) => {
            server.close((error) => (error ? reject(error) : done()));
          }),
      });
    });
  });
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const port = Number(process.env.DOWNLOAD_PORT ?? 8787);
  startDownloadServer(port).then(({ port: actual }) => {
    console.log(`下载接口：http://127.0.0.1:${actual}/api/templates/<模板id>/download`);
    console.log("请求头要带 Authorization: Bearer <DOWNLOAD_SECRET>");
  });
}
