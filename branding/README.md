# Branding

Icon family for Helios (the sun, host) and Selene (the moon, Android client).

- Helios: gold ring, ruby core, sun rays on the left that turn into orange waves leaving to the right. The host emits the stream.
- Selene: silver ring, crescent moon, sapphire core, waves arriving from the left that cool from orange to cyan. The client receives the stream and reflects it.

Palette: gold `#F5B82E`, orange `#FF6B1A`, ruby `#E0263B`, amber `#FFC861`, silver `#D9DEE8`, cyan `#5CE1FF`,
sapphire `#2F5BFF`, amethyst `#8B5CF6`, obsidian background `#0A0B0F`.

## Regenerating

```bash
node branding/generate.cjs        # writes branding/svg/*.svg (and the Android vector drawable)
python branding/export.py         # renders with headless Chrome/Edge, writes every icon in both repos
```

`export.py` expects the Selene checkout next to this one (`../Selene-Game-Streaming`, or `--selene PATH`) and needs Pillow.

| SVG | Used for |
|---|---|
| `helios-icon-rounded` | `apollo.svg/.png/.icns`, `apollo.ico` from 40 px up (executable, installer) |
| `helios-mark` | `apollo.ico` up to 32 px, web favicon, `logo-apollo*` (navbar) |
| `helios-mark-{playing,pausing,locked}` | tray icons `apollo-{state}*` |
| `selene-foreground` / `selene-background` / `selene-monochrome` | Android adaptive launcher layers |
| `selene-icon-rounded` | legacy launcher `ic_launcher.png` |
| `selene-icon` | `ic_launcher-web.png` (Play Store, 512 px) |
| `selene-monochrome-small` | notification icon `drawable/app_icon.png` |
| `selene-monochrome.xml` | TV channel logo `drawable/ic_lime_layer.xml` |
| `selene-banner-tv` / `selene-banner-ouya` | `atv_banner.png`, `ouya_icon.png` |
| `helios-selene-lockup` | README banner (`helios-selene.png`) |

The `apollo*` file names are kept on purpose (see the naming notes in `CLAUDE.md`); only the artwork changed.
