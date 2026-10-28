import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { choosePreviewSlides, findTitleSlide, titleSlideIndex } from "./preview.ts";

function same(actual: number[], expected: number[], label: string) {
  if (actual.join(",") !== expected.join(",")) {
    console.error(`${label} 选页不对：${actual.join(",")}，期望 ${expected.join(",")}`);
    process.exit(1);
  }
}

same(choosePreviewSlides(6, 0), [0, 1, 2, 3], "六页");
same(choosePreviewSlides(4, 0), [0, 1, 2, 3], "四页");
same(choosePreviewSlides(2, 0), [0, 1], "两页");
same(choosePreviewSlides(8, 5), [0, 1, 2, 5], "标题在第四页之后");
console.log("四页预览的选页是对的。");

function throws(read: () => number, label: string) {
  try {
    const index = read();
    console.error(`${label} 应该失败，实际得到 ${index}。`);
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("没有读出标题页。")) return;
    console.error(`${label} 的报错不对：${message}`);
    process.exit(1);
  }
}

if (titleSlideIndex(0, "0") !== 0 || titleSlideIndex(0, "0\n") !== 0) {
  console.error("正常退出并打印 0 应该表示没有标题版式。");
  process.exit(1);
}
throws(() => titleSlideIndex(1, "0"), "进程失败但打印了 0");
throws(() => titleSlideIndex(null, ""), "扫描没有启动");
throws(() => titleSlideIndex(0, ""), "输出是空的");
throws(() => titleSlideIndex(0, "none"), "输出不是页码");

function writeZip(path: string, files: Record<string, string>) {
  const script = `
import json, sys, zipfile
path, files = sys.argv[1], json.loads(sys.argv[2])
with zipfile.ZipFile(path, "w") as archive:
    for name, text in files.items():
        archive.writestr(name, text)
`;
  const result = spawnSync("python3", ["-c", script, path, JSON.stringify(files)], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "做测试用的文稿失败").trim());
  }
}

function scanSamples() {
  const dir = mkdtempSync(join(tmpdir(), "title-scan-"));
  try {
    const none = join(dir, "none.pptx");
    writeZip(none, { "ppt/slides/slide1.xml": "<p:sld></p:sld>" });
    if (findTitleSlide(none) !== 0) return "没有标题版式时应该得到 0。";

    const titled = join(dir, "titled.pptx");
    writeZip(titled, {
      "ppt/slides/slide1.xml": "<p:sld></p:sld>",
      "ppt/slides/slide2.xml": '<p:sp><p:ph type="ctrTitle"/></p:sp>',
    });
    if (findTitleSlide(titled) !== 1) return "标题在第二页时没有读到。";

    const broken = join(dir, "broken.pptx");
    writeFileSync(broken, "not a zip");
    try {
      const index = findTitleSlide(broken);
      return `坏掉的文稿应该失败，实际得到 ${index}。`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.startsWith("没有读出标题页。") || !message.includes("BadZipFile")) {
        return `坏掉的文稿报错不对：${message}`;
      }
    }
    return "";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let sampleError = "";
try {
  sampleError = scanSamples();
} catch (error) {
  sampleError = error instanceof Error ? error.message : String(error);
}
if (sampleError) {
  console.error(sampleError);
  process.exit(1);
}
console.log("标题页扫描失败不会被当成第 0 页。");
