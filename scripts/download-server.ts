import { createServer, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { handleDownload } from "../apps/web/lib/download.ts";

export { createR2Client, DOWNLOAD_EXPIRES_SECONDS } from "../apps/web/lib/download.ts";

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

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

export function startDownloadServer(port = 0) {
  assertDownloadEnv();
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
      const match = /^\/api\/templates\/([^/]+)\/download$/.exec(path);
      if (req.method !== "GET" || !match) {
        send(res, 404, { error: "没有这个接口" });
        return;
      }
      const result = await handleDownload(decodeURIComponent(match[1]), req.headers.authorization ?? null);
      send(res, result.status, result.body);
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
