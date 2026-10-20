import sys
from pathlib import Path

from PIL import Image


def main() -> None:
    output = Path(sys.argv[1])
    paths = sys.argv[2:]
    if not paths:
        raise SystemExit("没有可拼的幻灯片")

    cell_width = 720
    gap = 28
    pad = 28
    background = (236, 234, 230)
    thumbs = []
    for path in paths:
        image = Image.open(path).convert("RGB")
        height = round(image.height * cell_width / image.width)
        thumbs.append(image.resize((cell_width, height), Image.Resampling.LANCZOS))
    row_height = max(image.height for image in thumbs)
    columns = 2 if len(thumbs) > 1 else 1
    rows = (len(thumbs) + columns - 1) // columns
    width = pad * 2 + columns * cell_width + (columns - 1) * gap
    height = pad * 2 + rows * row_height + (rows - 1) * gap
    canvas = Image.new("RGB", (width, height), background)
    for index, image in enumerate(thumbs):
        column = index % columns
        row = index // columns
        x = pad + column * (cell_width + gap)
        y = pad + row * (row_height + gap)
        canvas.paste(image, (x, y + (row_height - image.height) // 2))
    canvas.save(output, "PNG")


if __name__ == "__main__":
    main()
