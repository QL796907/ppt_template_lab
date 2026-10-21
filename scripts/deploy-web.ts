import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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

const worker = "ppt-template-lab";
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web");
const vinextDeploy = join(webDir, "node_modules/.bin/vinext-cloudflare");
const cf = join(webDir, "node_modules/.bin/cf");
const token = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "";
const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "").trim();
const domain = (process.env.WEB_DOMAIN || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const missing = HOST_KEYS.filter((key) => !process.env[key]?.trim());

if (!accountId || missing.length > 0) {
  console.error("还不能部署：");
  if (!accountId) console.error("  - R2_ACCOUNT_ID");
  for (const key of missing) console.error(`  - ${key}`);
  process.exit(1);
}

const secrets = [token, accountId, ...HOST_KEYS.map((key) => process.env[key]!.trim())];
if (domain) secrets.push(domain);

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

function run(command: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: webDir,
      env: {
        ...process.env,
        ...(token ? { CLOUDFLARE_API_TOKEN: token } : {}),
        CLOUDFLARE_ACCOUNT_ID: accountId,
        WEB_DOMAIN: domain,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
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

async function deploy() {
  const result = await run(vinextDeploy, ["deploy"]);
  if (result.code !== 0) fail("部署", `${result.stderr}\n${result.stdout}`);
  return result;
}

async function saveSecrets() {
  const dir = mkdtempSync(join(tmpdir(), "ppt-secrets-"));
  const file = join(dir, "secrets.json");
  const body: Record<string, { name: string; type: "secret_text"; text: string }> = {};
  for (const key of HOST_KEYS) {
    body[key] = { name: key, type: "secret_text", text: process.env[key]!.trim() };
  }
  try {
    writeFileSync(file, JSON.stringify(body), { mode: 0o600 });
    const result = await run(cf, [
      "workers",
      "secrets",
      "bulk",
      "--worker",
      worker,
      "--secrets",
      `@${file}`,
    ]);
    if (result.code !== 0) fail("写入 Cloudflare 密钥", `${result.stderr}\n${result.stdout}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const deployed = await deploy();
await saveSecrets();
const output = `${deployed.stdout}\n${deployed.stderr}`;
const found = output.match(/https:\/\/[^\s"'<>]+/g) ?? [];
const urls = [...new Set(found.map((url) => url.replace(/[),.;]+$/, "")))];
if (domain) console.log(`https://${domain}`);
for (const url of urls) {
  if (!domain || url !== `https://${domain}`) console.log(url);
}
if (!domain && urls.length === 0) {
  console.log("部署完成。打开 Cloudflare 控制台里的 Workers，名称是 ppt-template-lab。");
}
