"""Generate self-contained README buttons with shaped Vazirmatn glyph outlines.

Optional design tools: pip install 'fonttools[woff]' uharfbuzz
Usage: python generate.py --font /path/to/Vazirmatn-Variable.woff2
The application does not need these tools or the source font at runtime.
"""

import argparse
import html
from io import BytesIO
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


BUTTONS = [
    ("demo", "دموی زنده و معرفی کامل", "rtl", "primary", "telegram", 352),
    ("install-fa", "راهنمای نصب فارسی", "rtl", "dark", "book", 264),
    ("install-en", "Installation guide", "ltr", "dark", "book", 264),
    ("overview-fa", "معرفی و تصاویر", "rtl", "light", "home", 264),
    ("overview-en", "Project overview", "ltr", "light", "home", 264),
]

ICONS = {
    "telegram": '<path d="m3 11 17-7-4 16-5-6-4 3v-5l9-5-7 7" fill="currentColor"/>',
    "book": '<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4zM13 7a3 3 0 0 1 3-3h4v14h-3a4 4 0 0 0-4 3"/>',
    "home": '<path d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
}


def load_font(path):
    font = TTFont(path)
    if "fvar" in font:
        font = instantiateVariableFont(font, {"wght": 650}, inplace=False)
    font.flavor = None
    data = BytesIO()
    font.save(data)
    face = hb.Face(data.getvalue())
    shaper = hb.Font(face)
    shaper.scale = (face.upem, face.upem)
    return font, shaper


def lettering(font, shaper, label, direction, center_x, center_y, max_width, size):
    buffer = hb.Buffer()
    buffer.add_str(label)
    buffer.guess_segment_properties()
    buffer.direction = direction
    buffer.language = "fa" if direction == "rtl" else "en"
    hb.shape(shaper, buffer)
    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    outlines = SVGPathPen(glyphs, ntos=lambda n: f"{n:.1f}".rstrip("0").rstrip("."))
    bounds = BoundsPen(glyphs)
    cursor_x = cursor_y = 0
    for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
        if info.codepoint == 0:
            raise ValueError(f"The font is missing a glyph in {label!r}")
        transform = (1, 0, 0, 1, cursor_x + position.x_offset, cursor_y + position.y_offset)
        for pen in (outlines, bounds):
            glyphs[order[info.codepoint]].draw(TransformPen(pen, transform))
        cursor_x += position.x_advance
        cursor_y += position.y_advance
    x_min, y_min, x_max, y_max = bounds.bounds
    scale = min(size / font["head"].unitsPerEm, max_width / (x_max - x_min))
    left = center_x - (x_min + x_max) * scale / 2
    baseline = center_y + (y_min + y_max) * scale / 2
    return f'<path transform="translate({left:.3f} {baseline:.3f}) scale({scale:.6f} {-scale:.6f})" d="{outlines.getCommands()}"/>'


def button(font, shaper, name, label, direction, variant, icon, width):
    primary = variant == "primary"
    height, box_height, radius = (72, 60, 18) if primary else (64, 52, 15)
    center_y = 4 + box_height / 2
    light = variant == "light"
    colors = {
        "primary": ("#279aff", "#3154e6", "#ffffff", "#ffffff", ".23"),
        "dark": ("#304763", "#18283d", "#ffffff", "#7d96b6", ".35"),
        "light": ("#f6faff", "#eaf2ff", "#2452a0", "#bbcff0", "1"),
    }
    start, end, text, stroke, stroke_opacity = colors[variant]
    center_x = width - 39 if direction == "rtl" else 39
    arrow_x = 31 if direction == "rtl" else width - 31
    text_x = width / 2 - 5 if direction == "rtl" else width / 2 + 5
    title = html.escape(label)
    icon_fill = "#d7e7ff" if light else "#ffffff"
    icon_opacity = "1" if light else ".13"
    glyph_path = lettering(font, shaper, label, direction, text_x, center_y, width - 108, 20 if primary else 18)
    arrow = 'm3-4-4 4 4 4M-1 0h8' if direction == "rtl" else 'm-3-4 4 4-4 4M1 0h-8'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
  <title id="title">{title}</title>
  <desc id="desc">Vazirmatn lettering is shaped and converted to outlines for consistent Persian rendering.</desc>
  <defs><linearGradient id="surface" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{start}"/><stop offset="1" stop-color="{end}"/></linearGradient></defs>
  <rect x="5" y="9" width="{width - 10}" height="{box_height}" rx="{radius}" fill="#173e79" opacity=".12"/>
  <rect x="4.5" y="4.5" width="{width - 9}" height="{box_height}" rx="{radius}" fill="url(#surface)" stroke="{stroke}" stroke-opacity="{stroke_opacity}"/>
  <path d="M{radius + 5} 6H{width - radius - 5}" fill="none" stroke="white" stroke-opacity=".2"/>
  <circle cx="{center_x}" cy="{center_y}" r="18" fill="{icon_fill}" opacity="{icon_opacity}"/>
  <g transform="translate({center_x - 12} {center_y - 12})" color="{text}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ICONS[icon]}</g>
  <g fill="{text}">{glyph_path}</g>
  <g transform="translate({arrow_x} {center_y})" fill="none" stroke="{text}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".8"><path d="{arrow}"/></g>
</svg>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", required=True, type=Path)
    args = parser.parse_args()
    font, shaper = load_font(args.font)
    directory = Path(__file__).resolve().parent
    for spec in BUTTONS:
        output = directory / (spec[0] + ".svg")
        output.write_text(button(font, shaper, *spec), encoding="utf-8")
        print(output.name)


if __name__ == "__main__":
    main()
