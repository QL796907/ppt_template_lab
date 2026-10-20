export {};

const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error("还不能连 Supabase：.env 里这些是空的：");
  for (const key of missing) console.error(`  - ${key}`);
  console.error("把 .env.example 复制成 .env，填上项目网址和 service_role 密钥后再运行。");
  console.error("不要把填好的 .env 提交到 Git。");
  process.exit(1);
}

const url = process.env.SUPABASE_URL!.trim().replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

const row = {
  title: "连通测试",
  tags: ["test"],
  theme: "test",
  color_tone: "none",
  preview_key: "healthcheck/preview.png",
  file_key: "healthcheck/ping.txt",
  source_note: "假数据，只为检查数据库连通",
};

const inserted = await fetch(`${url}/rest/v1/templates`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify(row),
});

if (!inserted.ok) {
  console.error(`写入失败（HTTP ${inserted.status}）。`);
  console.error(await inserted.text());
  process.exit(1);
}

const created = (await inserted.json()) as Array<{ id: string; title: string }>;
const id = created[0]?.id;
if (!id) {
  console.error("写入没有返回记录。");
  process.exit(1);
}
console.log(`已写入：${created[0].title}（${id}）`);

const selected = await fetch(
  `${url}/rest/v1/templates?id=eq.${id}&select=id,title,tags,theme,color_tone,preview_key,file_key,source_note,created_at`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  },
);

if (!selected.ok) {
  console.error(`读回失败（HTTP ${selected.status}）。`);
  console.error(await selected.text());
  process.exit(1);
}

const found = (await selected.json()) as Array<{ id: string; title: string; tags: string[] }>;
if (!found.some((item) => item.id === id)) {
  console.error("刚写入的记录没有查出来。");
  process.exit(1);
}

console.log(`已读回：${found[0].title}，标签 ${found[0].tags.join("、")}`);
console.log("第 2 步数据库检查通过。");
