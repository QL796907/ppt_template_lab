import { createServer } from "node:http";
import { classifyPreview, mergeLabels, parseLabels } from "./classify.ts";

const parsed = parseLabels(
  '```json\n{"theme":"教学","color_tone":"浅色","tags":["课件","文字"]}\n```',
);
if (parsed?.theme !== "教学" || parsed.colorTone !== "浅色" || parsed.tags.join(",") !== "课件,文字") {
  console.error("正常的分类结果没有读出来。");
  process.exit(1);
}
if (parseLabels("不是 json")) {
  console.error("读不懂的结果应该当成没有标签。");
  process.exit(1);
}

const kept = mergeLabels({ theme: "商务", colorTone: "", tags: [] }, parsed);
if (kept.theme !== "商务" || kept.colorTone !== "浅色" || kept.tags[0] !== "课件") {
  console.error("手填的主题应该保留，空着的色调和标签用自动结果。");
  process.exit(1);
}
console.log("分类结果的读取和合并是对的。");

delete process.env.VISION_API_KEY;
if (await classifyPreview(Buffer.from("png"))) {
  console.error("没有密钥时不应该打出标签。");
  process.exit(1);
}

const server = createServer((_req, res) => {
  res.writeHead(500);
  res.end("nope");
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
process.env.VISION_API_KEY = "bad";
process.env.VISION_API_BASE = `http://127.0.0.1:${port}/v1`;
const failed = await classifyPreview(Buffer.from("png"));
await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
if (failed) {
  console.error("接口失败时不应该返回标签。");
  process.exit(1);
}
console.log("接口失败时会跳过打标签。");
console.log("第 6 步本地检查通过。真实图片的标签还要有 VISION_API_KEY 才能打。");
