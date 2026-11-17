# Branding

Helios icon: the sun. Gold ring, ruby core and sun rays on the left that turn into orange waves leaving to the right:
the host emits the stream. It pairs with the Selene icon (the moon, which receives the stream and reflects it), kept in
[Selene-Game-Streaming/branding](https://github.com/eumarcodev/Selene-Game-Streaming/tree/develop/branding).

Palette: gold `#F5B82E`, orange `#FF6B1A`, ruby `#E0263B`, amber `#FFC861`, obsidian background `#0A0B0F`.
Selene side: silver `#D9DEE8`, cyan `#5CE1FF`, sapphire `#2F5BFF`, amethyst `#8B5CF6`.

## Files

| Path | What |
|---|---|
| `icon-core.cjs` | Shared building blocks (palette, ring, gem, waves). **Identical copy in Selene**: change both. |
| `generate.cjs` | Writes the Helios SVGs to `svg/` |
| `export.py` | Renders `svg/` with headless Chrome/Edge and writes every raster icon of this repo (needs Pillow) |
| `svg/` | Generated Helios SVGs |
| `helios-icon.png` | README icon |
| `helios-selene-lockup.svg`, `helios-selene.png` | The pair (README banner). Same files in both repos. |

## Regenerating

```bash
node branding/generate.cjs
python branding/export.py
```

| SVG | Used for |
|---|---|
| `helios-icon-rounded` | `apollo.svg/.png/.icns`, `apollo.ico` from 40 px up (executable, installer) |
| `helios-mark` | `apollo.ico` up to 32 px, web favicon, `logo-apollo*` (navbar) |
| `helios-mark-{playing,pausing,locked}` | tray icons `apollo-{state}*` |
| `helios-icon` | full-bleed square, for previews |

The `apollo*` file names are kept on purpose (see the naming notes in `CLAUDE.md`); only the artwork changed.
