"""Render the Helios branding SVGs and write every raster icon of this repository.

Usage (from the repository root, after `node branding/generate.cjs`):
    python branding/export.py [--chrome PATH]

Needs Google Chrome or Microsoft Edge (headless rendering) and Pillow.
"""
import argparse
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


def export(r):
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

    # README icon.
    save_png(r.sized("helios-icon-rounded.svg", 256), ROOT / "branding/helios-icon.png")



def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome")
    args = ap.parse_args()
    export(Renderer(find_chrome(args.chrome)))


if __name__ == "__main__":
    main()
