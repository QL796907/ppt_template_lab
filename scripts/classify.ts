export type Labels = {
  theme: string;
  colorTone: string;
  tags: string[];
};

const DEFAULT_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export async function classifyPreview(png: Buffer): Promise<Labels | null> {
  const key = process.env.VISION_API_KEY?.trim();
  if (!key) {
    console.error("没有填写 VISION_API_KEY，跳过自动打标签。");
    return null;
  }
  const base = (process.env.VISION_API_BASE?.trim() || DEFAULT_BASE).replace(/\/$/, "");
  const model = process.env.VISION_MODEL?.trim() || DEFAULT_MODEL;
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "你在给一份 PPT 模板的预览图分类。这张图是最多四页、含标题页的拼图。",
                  "只根据图里看得到的内容，用中文返回一个 JSON 对象，不要写解释。",
                  '{"theme":"2到6个字","color_tone":"浅色或深色或暖色或冷色","tags":["标签1","标签2"]}',
                  "theme 例如：商务、教学、节日、科技、简约。",
                  "tags 给两到四个，每个不超过 6 个字。",
                ].join(""),
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${png.toString("base64")}` },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.error(`自动打标签失败（HTTP ${response.status}），入库继续。`);
      return null;
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    const labels = parseLabels(text);
    if (!labels) console.error("自动打标签的结果读不懂，入库继续。");
    return labels;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    console.error(`自动打标签失败，入库继续。${message}`);
    return null;
  }
}

export function parseLabels(text: string): Labels | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { theme?: unknown; color_tone?: unknown; tags?: unknown };
  const theme = shortText(record.theme, 12);
  const colorTone = shortText(record.color_tone, 8);
  const tags = Array.isArray(record.tags)
    ? record.tags.map((tag) => shortText(tag, 12)).filter((tag) => tag).slice(0, 4)
    : [];
  if (!theme && !colorTone && tags.length === 0) return null;
  return { theme, colorTone, tags };
}

export function mergeLabels(
  chosen: { theme: string; colorTone: string; tags: string[] },
  auto: Labels | null,
) {
  return {
    theme: chosen.theme || auto?.theme || null,
    colorTone: chosen.colorTone || auto?.colorTone || null,
    tags: chosen.tags.length > 0 ? chosen.tags : (auto?.tags ?? []),
  };
}

function shortText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/,/g, " ").slice(0, max);
}
