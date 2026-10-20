import { timingSafeEqual } from "node:crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const DOWNLOAD_EXPIRES_SECONDS = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TemplateCard = {
  id: string;
  title: string;
  theme: string | null;
  colorTone: string | null;
  tags: string[];
  previewUrl: string | null;
};

type TemplateRow = {
  id: string;
  title: string;
  theme: string | null;
  color_tone: string | null;
  tags: string[] | null;
  preview_key: string | null;
  file_key: string | null;
};

export function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: required("R2_ENDPOINT").replace(/\/$/, ""),
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export async function listTemplates(filter: { theme?: string; tag?: string }) {
  const params = new URLSearchParams();
  params.set("select", "id,title,theme,color_tone,tags,preview_key,file_key");
  params.set("order", "created_at.desc");
  const theme = filter.theme?.trim();
  const tag = filter.tag?.trim();
  if (theme) params.set("theme", `eq.${theme}`);
  if (tag) params.set("tags", `cs.{${tag}}`);

  const rows = await supabaseGet<TemplateRow[]>(`/rest/v1/templates?${params}`);
  const cards: TemplateCard[] = [];
  for (const row of rows) {
    cards.push({
      id: row.id,
      title: row.title,
      theme: row.theme,
      colorTone: row.color_tone,
      tags: row.tags ?? [],
      previewUrl: await signPreview(row.preview_key),
    });
  }
  return cards;
}

export async function handleDownload(id: string, authorization: string | null) {
  if (!authorized(authorization)) {
    return { status: 401, body: { error: "需要下载密钥" } };
  }
  if (!UUID.test(id)) {
    return { status: 400, body: { error: "模板编号格式不对" } };
  }
  const rows = await supabaseGet<Array<{ file_key: string | null }>>(
    `/rest/v1/templates?id=eq.${encodeURIComponent(id)}&select=file_key`,
  );
  const fileKey = rows[0]?.file_key?.trim() ?? "";
  if (!fileKey) {
    return { status: 404, body: { error: "没有这个模板，或还没有文件" } };
  }
  const url = await getSignedUrl(
    createR2Client(),
    new GetObjectCommand({ Bucket: required("R2_BUCKET"), Key: fileKey }),
    { expiresIn: DOWNLOAD_EXPIRES_SECONDS },
  );
  return { status: 200, body: { url, expires_in: DOWNLOAD_EXPIRES_SECONDS } };
}

async function signPreview(key: string | null) {
  const objectKey = key?.trim();
  if (!objectKey) return null;
  try {
    return await getSignedUrl(
      createR2Client(),
      new GetObjectCommand({ Bucket: required("R2_BUCKET"), Key: objectKey }),
      { expiresIn: DOWNLOAD_EXPIRES_SECONDS },
    );
  } catch {
    return null;
  }
}

function authorized(authorization: string | null) {
  const header = authorization ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const expected = required("DOWNLOAD_SECRET");
  const provided = Buffer.from(given);
  const wanted = Buffer.from(expected);
  if (provided.length === 0 || provided.length !== wanted.length) return false;
  return timingSafeEqual(provided, wanted);
}

async function supabaseGet<T>(path: string): Promise<T> {
  const response = await fetch(`${required("SUPABASE_URL").replace(/\/$/, "")}${path}`, {
    headers: {
      apikey: required("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${required("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`读取目录失败（HTTP ${response.status}）`);
  }
  return (await response.json()) as T;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量：${name}`);
  return value;
}
