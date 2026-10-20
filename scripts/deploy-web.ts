import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HOST_KEYS = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DOWNLOAD_SECRET",
] as const;

const project = "ppt-template-lab";
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web");
const token = process.env.VERCEL_TOKEN?.trim() ?? "";
const missing = HOST_KEYS.filter((key) => !process.env[key]?.trim());

if (!token || missing.length > 0) {
  console.error("还不能部署：");
  if (!token) {
    console.error("  - VERCEL_TOKEN");
    console.error("到 https://vercel.com/account/tokens 创建一个令牌，写进本机 .env，不要提交。");
  }
  for (const key of missing) console.error(`  - ${key}`);
  process.exit(1);
}

const secrets = [token, ...HOST_KEYS.map((key) => process.env[key]!.trim())];

function redact(text: string) {
  let out = text;
  for (const secret of secrets) {
    if (secret.length > 0) out = out.split(secret).join("[已隐藏]");
  }
  return out;
}

function fail(step: string, detail: string): never {
  console.error(`${step}失败。`);
  const text = redact(detail).trim();
  if (text) console.error(text);
  process.exit(1);
}

async function vercelApi(path: string, method: string, body?: unknown) {
  const response = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

const existing = await vercelApi(`/v9/projects/${project}`, "GET");
if (existing.status === 404) {
  const created = await vercelApi("/v11/projects", "POST", {
    name: project,
    framework: "nextjs",
  });
  if (!created.ok) fail("创建 Vercel 项目", `${created.status}\n${created.text}`);
} else if (!existing.ok) {
  fail("查找 Vercel 项目", `${existing.status}\n${existing.text}`);
}

const saved = await vercelApi(`/v10/projects/${project}/env?upsert=true`, "POST", HOST_KEYS.map((key) => ({
  key,
  value: process.env[key]!.trim(),
  type: "sensitive",
  target: ["production", "preview"],
})));
if (!saved.ok) fail("写入托管环境变量", `${saved.status}\n${saved.text}`);
try {
  const payload = JSON.parse(saved.text) as { failed?: unknown[] };
  if (Array.isArray(payload.failed) && payload.failed.length > 0) {
    fail("写入托管环境变量", saved.text);
  }
} catch {
  fail("写入托管环境变量", saved.text);
}

function deploy() {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolveRun, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "vercel@64.7.0",
        "deploy",
        "--prod",
        "--force",
        "--project",
        project,
        "--json",
        "--token",
        token,
        "--non-interactive",
        "--yes",
      ],
      {
        cwd: webDir,
        env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolveRun({ code: code ?? 1, stdout, stderr });
    });
  });
}

const deployed = await deploy();
if (deployed.code !== 0) fail("部署", `${deployed.stderr}\n${deployed.stdout}`);

let url = "";
try {
  const payload = JSON.parse(deployed.stdout);
  const deployment = payload.deployment ?? payload;
  url = String(deployment.url ?? "");
} catch {
  url = "";
}
if (url && !url.startsWith("https://")) url = `https://${url}`;
if (!url) fail("部署完成但没有拿到网址", deployed.stdout);
console.log(url);
