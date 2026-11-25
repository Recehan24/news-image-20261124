#!/usr/bin/env python3
"""Generate the news-image-20261124 front page (1024x1024, deterministic).

Draws a newspaper front page summing up Tuesday 24 November 2026:
hero = the ICJ's historic genocide verdict against Myanmar over the
Rohingya (9-6); six further stories below it.
No network, no clock, no randomness: same input -> byte-identical PNG.

Written in this session (25 Nov 2026) as the v2-fixed artwork for the
news-image-20261124 make.fun entry.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

W = H = 1024
M = 26  # outer margin
PAPER = (248, 244, 233)
INK = (12, 12, 12)
RED = (178, 28, 28)
GREY = (70, 70, 70)
HERO_BG = (251, 233, 231)

SERIF_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def fits(draw, text, fnt, max_w):
    return draw.textlength(text, font=fnt) <= max_w


def wrap(draw, text, fnt, max_w, max_lines):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        raise SystemExit(f"TEXT OVERFLOW ({max_lines} lines max): {text!r} -> {lines}")
    return lines


HERO_KICKER = "THE HAGUE  —  ICJ VERDICT"
HERO_HEAD = "MYANMAR GUILTY OF GENOCIDE"
HERO_DECK = ("The world court rules 9-6 against Myanmar in a historic genocide "
             "case over the Rohingya — the first verdict of its kind.")

# (kicker, headline, deck) — every headline 1 line, every deck max 2 lines.
STORIES = [
    ("SPACE & SECURITY",
     "NATO VOWS TO DEFEND SPACE",
     "Alliance responds to reports of a Russian nuclear satellite."),
    ("MARKETS",
     "HUANG BACK AS NVIDIA CEO",
     "Nasdaq surges 6.5% as Jensen Huang is reinstated."),
    ("WAR AT SEA",
     "UKRAINE SINKS RUSSIAN WARSHIP",
     "Russian warship sunk off the coast of Libya."),
    ("MEXICO",
     "EL CHAPO ISIDRO CAPTURED",
     "Mexican forces capture the cartel leader."),
    ("INDONESIA",
     "FACTORY FIRE KILLS 26",
     "Blaze at an Indonesian factory claims 26 lives."),
    ("NEPAL",
     "M5.6 EARTHQUAKE HITS NEPAL",
     "Strong tremor shakes Nepal; damage assessed."),
]

FOOTER = "SOURCES: REUTERS — AP — AFP — AL JAZEERA   •   TUESDAY 24 NOVEMBER 2026"


def main(out_path):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # Outer double border.
    d.rectangle([M - 8, M - 8, W - M + 8, H - M + 8], outline=INK, width=3)
    d.rectangle([M - 2, M - 2, W - M + 2, H - M + 2], outline=INK, width=1)

    # Masthead: shrink until it fits the page width.
    title = "THE WORLD TODAY"
    mast_size = 92
    while mast_size > 40:
        f_mast = font(SERIF_B, mast_size)
        if d.textlength(title, font=f_mast) <= W - 2 * (M + 14):
            break
        mast_size -= 2
    f_mast = font(SERIF_B, mast_size)
    d.text(((W - d.textlength(title, font=f_mast)) / 2, 26), title, font=f_mast, fill=INK)
    d.rectangle([M + 14, 122, W - M - 14, 126], fill=RED)
    f_date = font(SANS_B, 21)
    date_line = "TUESDAY, 24 NOVEMBER 2026    •    7 STORIES"
    d.text(((W - d.textlength(date_line, font=f_date)) / 2, 136), date_line,
           font=f_date, fill=INK)
    d.line([M + 14, 168, W - M - 14, 168], fill=INK, width=2)

    # Hero panel.
    hx0, hy0, hx1, hy1 = M + 14, 180, W - M - 14, 372
    d.rectangle([hx0, hy0, hx1, hy1], fill=HERO_BG, outline=INK, width=2)
    f_kick = font(SANS_B, 21)
    d.text((hx0 + 18, hy0 + 10), HERO_KICKER, font=f_kick, fill=RED)
    f_hero = None
    for hs in (50, 46, 42, 38):
        fh = font(SERIF_B, hs)
        if fits(d, HERO_HEAD, fh, hx1 - hx0 - 36):
            f_hero = fh
            break
    if f_hero is None:
        raise SystemExit("hero headline too wide")
    d.text((hx0 + 18, hy0 + 38), HERO_HEAD, font=f_hero, fill=INK)
    f_deck = font(SANS, 22)
    lines = wrap(d, HERO_DECK, f_deck, hx1 - hx0 - 36, 2)
    y = hy0 + 106
    for ln in lines:
        d.text((hx0 + 18, y), ln, font=f_deck, fill=INK)
        y += 30

    # Story grid: 2 cols x 3 rows.
    gx0, gy0 = M + 14, 386
    gw, gh, gap = 468, 182, 12
    for i, (kicker, head, deck) in enumerate(STORIES):
        col, row = i % 2, i // 2
        x0 = gx0 + col * (gw + gap)
        y0 = gy0 + row * (gh + gap)
        x1, y1 = x0 + gw, y0 + gh
        d.rectangle([x0, y0, x1, y1], outline=INK, width=2)
        inner_w = gw - 20
        f_kick2 = font(SANS_B, 18)
        d.text((x0 + 10, y0 + 10), kicker, font=f_kick2, fill=RED)
        # Largest headline size that fits on one line.
        f_head = None
        for hs in (24, 23, 22, 21, 20):
            fh = font(SANS_B, hs)
            if fits(d, head, fh, inner_w):
                f_head = fh
                break
        if f_head is None:
            raise SystemExit(f"headline does not fit: {head!r}")
        hh = f_head.getbbox("Ag")[3] - f_head.getbbox("Ag")[1]
        d.text((x0 + 10, y0 + 40), head, font=f_head, fill=INK)
        f_sub = font(SANS, 18)
        lines = wrap(d, deck, f_sub, inner_w, 2)
        y = y0 + 40 + hh + 12
        for ln in lines:
            d.text((x0 + 10, y), ln, font=f_sub, fill=GREY)
            y += 24

    # Footer strip.
    fy0, fy1 = 964, 998
    d.rectangle([M + 14, fy0, W - M - 14, fy1], fill=INK)
    f_foot = font(SANS_B, 16)
    d.text(((W - d.textlength(FOOTER, font=f_foot)) / 2, fy0 + 8), FOOTER,
           font=f_foot, fill=PAPER)

    img.save(out_path, "PNG")
    print(f"wrote {out_path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "entry.png")
