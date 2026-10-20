import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    output = Path(sys.argv[1])
    pairs = sys.argv[2:]
    slides = []
    for index in range(0, len(pairs), 2):
        number = int(pairs[index])
        image = Image.open(pairs[index + 1]).convert("RGB")
        slides.append((number, image))
    if not slides:
        raise SystemExit("没有可拼的幻灯片")

    cell_width = 720
    gap_x = 40
    gap_y = 28
    number_height = 42
    pad = 32
    background = (236, 234, 230)
    thumbs = []
    for number, image in slides:
        height = round(image.height * cell_width / image.width)
        thumbs.append((number, image.resize((cell_width, height), Image.Resampling.LANCZOS)))
    row_height = max(image.height for _, image in thumbs)
    columns = 2 if len(thumbs) > 1 else 1
    rows = (len(thumbs) + columns - 1) // columns
    width = pad * 2 + columns * cell_width + (columns - 1) * gap_x
    height = pad * 2 + rows * (row_height + number_height) + (rows - 1) * gap_y
    canvas = Image.new("RGB", (width, height), background)
    draw = ImageDraw.Draw(canvas)
    font = load_font(28)
    for index, (number, image) in enumerate(thumbs):
        column = index % columns
        row = index // columns
        x = pad + column * (cell_width + gap_x)
        y = pad + row * (row_height + number_height + gap_y)
        canvas.paste(image, (x, y + (row_height - image.height) // 2))
        draw.text((x, y + row_height + 6), str(number), fill=(120, 116, 110), font=font)
    canvas.save(output, "PNG")


def load_font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


if __name__ == "__main__":
    main()
