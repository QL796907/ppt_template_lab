import { choosePreviewSlides } from "./preview.ts";

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
