#!/usr/bin/env python3
"""Build img/ from the original photos.

    uv run --with pillow tools/build_images.py --src ~/scratch/blossom-research

The originals (Blossom's press photos and Instagram posts) are not kept in this
repo; --src is the folder they were saved to. Cut-outs come from
tools/cutout.swift (Apple's subject lift), run once per photo:

    swiftc -O tools/cutout.swift -o /tmp/cutout
    /tmp/cutout photo.jpg <src>/cut/hero.png 2400
"""
import argparse
import pathlib

from PIL import Image, ImageOps

SITE = pathlib.Path(__file__).resolve().parent.parent

# name: (source, width in px). Trimmed to the subject, saved with transparency.
CUTS = {
    "hero": ("cut/hero.png", 1500),
    "hero-m": ("cut/hero.png", 860),
    "crouch": ("cut/crouch.png", 760),
    "flex": ("cut/flex.png", 1100),
    "floral": ("cut/floral.png", 720),
    "stand": ("cut/stand.png", 820),
}

# name: (source, out width, out height, focus x, focus y, zoom). The crop keeps the
# output shape, is centred on the focus point (0..1 of the photo) and zoom > 1 tightens it.
CROPS = {
    # tour passes, 3:4
    "pass-1": ("img2/igc_DeH_o5Sktim_05.jpg", 720, 960, .50, .36, 1.45),
    "pass-2": ("img/komi_text.jpg", 720, 960, .56, .50, 1.0),
    "pass-3": ("img2/igc_DeH_o5Sktim_02.jpg", 720, 960, .52, .40, 1.2),
    "pass-4": ("img/komi_hero.png", 720, 960, .42, .30, 1.55),
    "pass-5": ("img2/igc_DeH_o5Sktim_01.jpg", 720, 960, .46, .34, 1.6),
    "pass-6": ("press/makino_graffiti.jpg", 720, 960, .52, .32, 1.5),
    "pass-7": ("img/sc_avatar.jpg", 720, 960, .50, .50, 1.0),
    # moments, 4:5
    "m-coachella-1": ("img2/igc_DXXXToXge7v_01.jpg", 720, 900, .50, .50, 1.0),
    "m-coachella-2": ("img2/igc_DXXXToXge7v_03.jpg", 720, 900, .60, .45, 1.0),
    "m-coachella-3": ("img2/igc_DXXXToXge7v_05.jpg", 720, 900, .50, .50, 1.0),
    "m-coachella-4": ("img2/igc_DXXXToXge7v_07.jpg", 720, 900, .45, .45, 1.0),
    "m-edmonton-1": ("img2/igc_DfNtL2DElB4_01.jpg", 720, 900, .50, .45, 1.0),
    "m-edmonton-2": ("img2/igc_DfNtL2DElB4_02.jpg", 720, 900, .50, .50, 1.0),
    "m-edmonton-3": ("img2/igc_DfNtL2DElB4_03.jpg", 720, 900, .50, .50, 1.0),
    "m-edmonton-4": ("img2/igc_DfNtL2DElB4_04.jpg", 720, 900, .55, .45, 1.0),
    "m-edmonton-5": ("img2/igc_DfNtL2DElB4_05.jpg", 720, 900, .50, .50, 1.0),
    "m-edmonton-6": ("img2/igc_DfNtL2DElB4_06.jpg", 720, 900, .55, .45, 1.0),
    "m-aus-1": ("img2/igc_Dfk35ixk0S-_01.jpg", 720, 900, .50, .42, 1.0),
    "m-aus-2": ("img2/igc_Dfk35ixk0S-_06.jpg", 720, 900, .50, .45, 1.0),
    "m-melbourne": ("img2/igc_DfSuY8Bkndv_01.jpg", 720, 900, .40, .40, 1.0),
    "m-shoot-1": ("img2/igc_DeH_o5Sktim_03.jpg", 720, 900, .55, .50, 1.0),
    "m-shoot-2": ("img2/igc_DeH_o5Sktim_09.jpg", 720, 900, .50, .50, 1.0),
    "m-shoot-3": ("img2/igc_DeH_o5Sktim_04.jpg", 720, 900, .55, .45, 1.0),
    "m-back": ("press/bit_back.jpg", 720, 900, .55, .50, 1.0),
    # wide pictures
    "wide-floral": ("press/sq_floral_landscape.jpg", 1800, 1200, .42, .50, 1.0),
    "wide-coachella": ("img2/igc_DXXXToXge7v_01.jpg", 1092, 820, .50, .56, 1.0),
    "wide-edmonton": ("img2/igc_DfNtL2DElB4_05.jpg", 1389, 926, .50, .55, 1.0),
}

# name: (source, width). Kept whole, with transparency.
LOGOS = {
    "logo-pink": ("img/komi_logo.png", 900),
    "logo-white": ("press/logo_star_white.png", 900),
}


def crop_to(img, w, h, fx, fy, zoom):
    sw, sh = img.size
    scale = min(sw / w, sh / h) / zoom
    cw, ch = w * scale, h * scale
    left = min(max(fx * sw - cw / 2, 0), sw - cw)
    top = min(max(fy * sh - ch / 2, 0), sh - ch)
    return img.crop((round(left), round(top), round(left + cw), round(top + ch))).resize((w, h), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, type=pathlib.Path)
    src = ap.parse_args().src.expanduser()
    out = SITE / "img"
    out.mkdir(exist_ok=True)
    total = 0
    for name, (path, width) in CUTS.items():
        img = Image.open(src / path).convert("RGBA")
        img = img.crop(img.getbbox())
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        img.save(out / f"{name}.webp", "WEBP", quality=86, method=6)
        total += (out / f"{name}.webp").stat().st_size
        print(f"cut   {name:16} {img.width}x{img.height}")
    for name, (path, w, h, fx, fy, zoom) in CROPS.items():
        img = ImageOps.exif_transpose(Image.open(src / path)).convert("RGB")
        crop_to(img, w, h, fx, fy, zoom).save(out / f"{name}.webp", "WEBP", quality=80, method=6)
        total += (out / f"{name}.webp").stat().st_size
        print(f"crop  {name:16} {w}x{h}")
    for name, (path, width) in LOGOS.items():
        img = Image.open(src / path).convert("RGBA")
        img = img.crop(img.getbbox())
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        img.save(out / f"{name}.webp", "WEBP", quality=90, method=6)
        total += (out / f"{name}.webp").stat().st_size
        print(f"logo  {name:16} {img.width}x{img.height}")
    print(f"{total // 1024} KB in img/")


if __name__ == "__main__":
    main()
