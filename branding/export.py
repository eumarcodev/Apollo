"""Render the branding SVGs and write every raster icon into Helios and Selene.

Usage (from the Helios-Server root, after `node branding/generate.cjs`):
    python branding/export.py [--selene ../Selene-Game-Streaming] [--chrome PATH]

Needs Google Chrome or Microsoft Edge (headless rendering) and Pillow.
"""
import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "branding" / "svg"
CHROMES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "google-chrome",
    "chromium",
]


def find_chrome(explicit):
    for c in ([explicit] if explicit else []) + CHROMES:
        if c and (Path(c).exists() or shutil.which(c)):
            return c
    raise SystemExit("Chrome or Edge not found; pass --chrome")


class Renderer:
    def __init__(self, chrome):
        self.chrome = chrome
        self.tmp = Path(tempfile.mkdtemp(prefix="branding-"))
        self.cache = {}

    def render(self, name, w=1024, h=1024):
        key = (name, w, h)
        if key in self.cache:
            return self.cache[key].copy()
        src = SVG / name
        out = self.tmp / f"{src.stem}-{w}x{h}.png"
        subprocess.run(
            [self.chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             "--force-device-scale-factor=1", "--default-background-color=00000000",
             f"--window-size={w},{h}", f"--screenshot={out}", src.as_uri()],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        img = Image.open(out).convert("RGBA")
        if img.size != (w, h):
            raise SystemExit(f"{name}: rendered {img.size}, expected {(w, h)}")
        self.cache[key] = img
        return img.copy()

    def sized(self, name, size):
        return self.render(name).resize((size, size), Image.LANCZOS)


def save_png(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("  ", path)


def save_ico(r, path, small_svg, large_svg, sizes, split=32):
    """ICO with the small mark up to `split` px and the large icon above it."""
    frames = [r.sized(small_svg if s <= split else large_svg, s) for s in sizes]
    biggest = max(frames, key=lambda i: i.size[0])
    others = [i for i in frames if i is not biggest]
    biggest.save(path, format="ICO", sizes=[(s, s) for s in sizes], append_images=others)
    got = sorted(Image.open(path).info.get("sizes", []))
    print("  ", path, "sizes", got)


def helios(r):
    print("Helios")
    images = ROOT / "src_assets/common/assets/web/public/images"
    ico_sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]

    # Executable, installer and packaging icon.
    shutil.copyfile(SVG / "helios-icon-rounded.svg", ROOT / "apollo.svg")
    save_png(r.render("helios-icon-rounded.svg"), ROOT / "apollo.png")
    save_ico(r, ROOT / "apollo.ico", "helios-mark.svg", "helios-icon-rounded.svg", ico_sizes)
    r.render("helios-icon-rounded.svg").save(ROOT / "apollo.icns", format="ICNS")
    print("  ", ROOT / "apollo.icns")

    # Web UI: favicon and navbar logo.
    shutil.copyfile(ROOT / "apollo.ico", images / "apollo.ico")
    shutil.copyfile(SVG / "helios-mark.svg", images / "logo-apollo.svg")
    for s in (16, 45):
        save_png(r.sized("helios-mark.svg", s), images / f"logo-apollo-{s}.png")

    # Tray states.
    for state in ("playing", "pausing", "locked"):
        svg = f"helios-mark-{state}.svg"
        shutil.copyfile(SVG / svg, images / f"apollo-{state}.svg")
        save_png(r.render(svg), images / f"apollo-{state}.png")
        for s in (16, 45):
            save_png(r.sized(svg, s), images / f"apollo-{state}-{s}.png")
        save_ico(r, images / f"apollo-{state}.ico", svg, svg, ico_sizes)

    # README images.
    docs = ROOT / "branding"
    save_png(r.sized("helios-icon-rounded.svg", 256), docs / "helios-icon.png")
    save_png(r.render("helios-selene-lockup.svg", 2048, 1024).resize((1200, 600), Image.LANCZOS),
             docs / "helios-selene.png")


def selene(r, repo):
    print("Selene")
    res = repo / "app/src/main/res"
    densities = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for d, k in densities.items():
        legacy, adaptive = round(48 * k), round(108 * k)
        save_png(r.sized("selene-icon-rounded.svg", legacy), res / f"mipmap-{d}/ic_launcher.png")
        save_png(r.sized("selene-foreground.svg", adaptive), res / f"mipmap-{d}/ic_launcher_foreground.png")
        save_png(r.sized("selene-background.svg", adaptive), res / f"mipmap-{d}/ic_launcher_background.png")
        save_png(r.sized("selene-monochrome.svg", adaptive), res / f"mipmap-{d}/ic_launcher_monochrome.png")
    save_png(r.sized("selene-icon.svg", 512), repo / "app/src/main/ic_launcher-web.png")
    save_png(r.sized("selene-monochrome-small.svg", 96), res / "drawable/app_icon.png")
    save_png(r.render("selene-banner-tv.svg", 320, 180), res / "drawable-xhdpi/atv_banner.png")
    save_png(r.render("selene-banner-ouya.svg", 732, 412).convert("RGB"), res / "drawable-xhdpi/ouya_icon.png")
    shutil.copyfile(SVG / "selene-monochrome.xml", res / "drawable/ic_lime_layer.xml")

    docs = repo / "branding"
    docs.mkdir(exist_ok=True)
    for svg in ("selene-icon.svg", "selene-icon-rounded.svg", "selene-foreground.svg",
                "selene-background.svg", "selene-monochrome.svg", "helios-selene-lockup.svg"):
        shutil.copyfile(SVG / svg, docs / svg)
    save_png(r.sized("selene-icon-rounded.svg", 256), docs / "selene-icon.png")
    shutil.copyfile(ROOT / "branding/helios-selene.png", docs / "helios-selene.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selene", default=str(ROOT.parent / "Selene-Game-Streaming"))
    ap.add_argument("--chrome")
    args = ap.parse_args()
    r = Renderer(find_chrome(args.chrome))
    helios(r)
    sel = Path(args.selene)
    if sel.exists():
        selene(r, sel)
    else:
        print(f"Selene checkout not found at {sel}, skipped")


if __name__ == "__main__":
    main()
