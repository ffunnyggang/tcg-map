#!/usr/bin/env python3
"""Prepare masked provider requests; assemble 68x93mm artwork without resizing.

Source must be verified unadorned artwork centered on the original 63x88mm
footprint, at 16px/mm. Supply only the verified contiguous rectangle, never
synthetic exterior pixels. Provider result must use the exact same canvas.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

CANVAS = (1648, 2048)
BLEED = (280, 40, 1368, 1528)
CENTER = (824, 784)


def artwork(path):
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
    if rgba.getchannel("A").getextrema() != (255, 255):
        raise ValueError("Artwork must be fully opaque")
    w, h = rgba.size
    if not (1008 <= w <= 1088 and 1408 <= h <= 1488 and w % 2 == h % 2 == 0):
        raise ValueError("Expected centered 63×88 to 68×93 mm at 16px/mm, with integer edges")
    x, y = CENTER[0] - w // 2, CENTER[1] - h // 2
    return rgba, (x, y, x + w, y + h)


def prepare(source, directory):
    art, rect = artwork(source)
    if rect == BLEED:
        raise ValueError("Artwork already covers the full bleed; no AI request needed")
    directory.mkdir(parents=True, exist_ok=True)
    base = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    base.paste(art, rect[:2])
    mask = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    ImageDraw.Draw(mask).rectangle((rect[0], rect[1], rect[2]-1, rect[3]-1), fill=(255,)*4)
    base.save(directory / "source.png")
    mask.save(directory / "mask.png")


def assemble(source, generated, output):
    art, rect = artwork(source)
    with Image.open(generated) as response:
        if response.size != CANVAS:
            raise ValueError("AI response canvas dimensions differ; no resize is allowed")
        gen = response.convert("RGBA")
    gen.paste(art, rect[:2])
    result = gen.crop(BLEED)
    if result.getchannel("A").getextrema() != (255, 255):
        raise ValueError("AI output did not fill the complete bleed area")
    subrect = tuple(v - BLEED[i % 2] for i, v in enumerate(rect))
    if ImageChops.difference(result.crop(subrect).convert("RGB"), art.convert("RGB")).getbbox():
        raise ValueError("Source artwork changed")
    result.save(output, format="PNG")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("mode", choices=["prepare", "assemble"])
    p.add_argument("source", type=Path)
    p.add_argument("destination", type=Path, help="Request directory or final PNG path")
    p.add_argument("--generated", type=Path, help="Required in assemble mode")
    a = p.parse_args()
    if a.mode == "prepare":
        prepare(a.source, a.destination)
    elif a.generated:
        assemble(a.source, a.generated, a.destination)
    else:
        p.error("--generated is required in assemble mode")


if __name__ == "__main__":
    main()
