import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function choosePreviewSlides(count: number, titleIndex: number) {
  if (count <= 0) return [];
  const title = Math.min(Math.max(titleIndex, 0), count - 1);
  if (count <= 4) return Array.from({ length: count }, (_, index) => index);
  const picked = [0, 1, 2, 3];
  if (!picked.includes(title)) picked[3] = title;
  return picked;
}

export function titleSlideIndex(status: number | null, stdout: string, detail = "") {
  const text = stdout.trim();
  if (status === 0 && /^\d+$/.test(text)) return Number(text);
  const reason = detail.trim();
  throw new Error(reason ? `没有读出标题页。\n${reason}` : "没有读出标题页。");
}

export function findTitleSlide(pptxPath: string) {
  const result = spawnSync("python3", ["-c", TITLE_SCRIPT, pptxPath], { encoding: "utf8" });
  return titleSlideIndex(result.status, result.stdout ?? "", result.stderr || result.error?.message || "");
}

export function composePreview(dir: string, pdfName: string, pptxPath: string) {
  const rendered = spawnSync("pdftoppm", ["-png", join(dir, pdfName), join(dir, "slide")], {
    encoding: "utf8",
  });
  if (rendered.status !== 0) {
    throw new Error((rendered.stderr || rendered.stdout || "最多四页、含标题页的拼图没有变成图片").trim());
  }
  const pages = readdirSync(dir)
    .filter((name) => /^slide-\d+\.png$/.test(name))
    .sort((left, right) => pageNumber(left) - pageNumber(right));
  if (pages.length === 0) throw new Error("没有生成幻灯片图片");
  const titleIndex = findTitleSlide(pptxPath);
  const chosen = choosePreviewSlides(pages.length, titleIndex);
  if (!chosen.includes(titleIndex)) throw new Error("预览里没有标题页");
  const sheet = join(dir, "sheet.png");
  const args = [fileURLToPath(new URL("./preview_sheet.py", import.meta.url)), sheet];
  for (const index of chosen) args.push(join(dir, pages[index]));
  const composed = spawnSync("python3", args, { encoding: "utf8" });
  if (composed.status !== 0) {
    throw new Error((composed.stderr || composed.stdout || "拼预览图失败").trim());
  }
  return {
    sheet,
    pages: chosen.map((index) => index + 1),
  };
}

function pageNumber(name: string) {
  return Number.parseInt(basename(name, ".png").replace("slide-", ""), 10);
}

const TITLE_SCRIPT = `
import re, sys, zipfile
pptx = zipfile.ZipFile(sys.argv[1])
names = set(pptx.namelist())
slides = sorted(
    [name for name in names if re.fullmatch(r"ppt/slides/slide\\d+\\.xml", name)],
    key=lambda name: int(re.search(r"(\\d+)", name).group(1)),
)

def layout_name(slide):
    rel = slide.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"
    if rel not in names:
        return ""
    match = re.search(r'Target="([^"]*slideLayout\\d+\\.xml)"', pptx.read(rel).decode("utf-8", "ignore"))
    if not match:
        return ""
    layout = "ppt/slideLayouts/" + match.group(1).split("/")[-1]
    if layout not in names:
        return ""
    found = re.search(r'<p:cSld[^>]*name="([^"]*)"', pptx.read(layout).decode("utf-8", "ignore"))
    return found.group(1) if found else ""

title = 0
for index, slide in enumerate(slides):
    xml = pptx.read(slide).decode("utf-8", "ignore")
    layout = layout_name(slide)
    if 'type="ctrTitle"' in xml or re.search(r"title slide|标题幻灯片", layout, re.I):
        title = index
        break
print(title)
`;
