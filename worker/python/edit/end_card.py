"""Tela final do vídeo editado (RF21): fundo na cor da marca, chamada para ação e a palavra-chave em destaque.

Lê um JSON no stdin: {"out", "width", "height", "keyword", "cta", "background", "color", "accent", "font"}
e grava um PNG em "out". Imprime {"path": "<out>"} no stdout. Só Pillow (sem OpenCV).
Códigos de saída: 0 ok, 2 entrada inválida.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FALLBACK_FONTS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
)
MARGIN = 0.08  # fração da largura em cada lado


def load_font(path: str | None, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (path, *FALLBACK_FONTS):
        if candidate and Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size)


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    for word in text.split():
        trial = f"{lines[-1]} {word}" if lines else word
        if lines and draw.textlength(trial, font=font) <= max_width:
            lines[-1] = trial
        else:
            lines.append(word)
    return lines


def fit_size(draw: ImageDraw.ImageDraw, text: str, font_path: str | None, start: int, max_width: int) -> int:
    size = start
    while size > 24 and draw.textlength(text, font=load_font(font_path, size)) > max_width:
        size -= 4
    return size


def render(spec: dict) -> Image.Image:
    width, height = int(spec["width"]), int(spec["height"])
    image = Image.new("RGB", (width, height), spec.get("background", "#111111"))
    draw = ImageDraw.Draw(image)
    max_width = int(width * (1 - 2 * MARGIN))
    font_path = spec.get("font")

    cta_font = load_font(font_path, int(width * 0.065))
    cta_lines = wrap(draw, spec["cta"], cta_font, max_width)
    keyword = spec["keyword"].upper()
    keyword_font = load_font(font_path, fit_size(draw, keyword, font_path, int(width * 0.16), max_width))

    line_h = int(cta_font.size * 1.25) if hasattr(cta_font, "size") else 60
    kw_box = draw.textbbox((0, 0), keyword, font=keyword_font)
    kw_h = kw_box[3] - kw_box[1]
    gap = int(height * 0.04)
    total = len(cta_lines) * line_h + gap + kw_h
    y = (height - total) // 2

    for line in cta_lines:
        draw.text((width // 2, y), line, font=cta_font, fill=spec.get("color", "#FFFFFF"), anchor="ma")
        y += line_h
    y += gap
    draw.text((width // 2, y), keyword, font=keyword_font, fill=spec.get("accent", "#FFE11A"), anchor="ma")
    return image


def main() -> int:
    try:
        spec = json.loads(sys.stdin.read())
        for key in ("out", "width", "height", "keyword", "cta"):
            if not spec.get(key):
                raise ValueError(f"missing {key}")
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"[end_card] bad input: {exc}", file=sys.stderr)
        return 2
    out = Path(spec["out"])
    out.parent.mkdir(parents=True, exist_ok=True)
    render(spec).save(out)
    sys.stdout.write(json.dumps({"path": str(out)}) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
