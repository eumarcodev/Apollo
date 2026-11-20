# Helios / Selene app icon prompts

Send each prompt together with the matching reference image from this folder.
The drafts fix the composition, proportions and colors; the models should keep them
and only raise the craft (materials, light, detail).

| File | Use |
|---|---|
| `helios-icon.png` / `.svg` | Reference for the Helios (server) icon |
| `selene-icon.png` / `.svg` | Reference for the Selene (client) icon |
| `helios-selene-lockup.png` / `.svg` | Reference for the pair (consistency check) |
| `preview.png` | How the drafts read at 192/96/48/24 px, circle mask and grayscale |

Concept: Helios is the sun and emits the stream; Selene is the moon and reflects it.
The wave always travels left to right: it leaves Helios and arrives at Selene.

---

## Shared style block (paste at the top of every prompt)

```
REFERENCE IMAGE ATTACHED. Use it as the layout blueprint: keep the composition, the
position and proportion of every element, the silhouette and the color palette. Do NOT
add, remove or move elements. Your job is to upgrade the rendering quality only.

PURPOSE: this is an APP ICON (Android launcher adaptive icon + Windows app icon).
- Square 1024x1024, full-bleed background, NO rounded corners, NO border, NO text.
  The platform applies its own mask (circle, squircle, rounded square).
- Keep the whole emblem (ring included) inside the central 62% circle (safe zone).
  Only the glowing waves may extend past it and get cropped.
- Must stay recognizable at 48px and 24px: bold silhouette, strong contrast between the
  gem and the background, no hairline details that carry meaning.

RENDERING STYLE: premium crafted artifact meets modern app icon. Polished engraved
precious metal with clean bevels, a faceted octagonal cut gemstone with internal
refraction and a crisp specular highlight, soft bloom glow on the energy waves, subtle
rim light, deep obsidian background (#0A0B0F) with a soft colored radial glow behind
the emblem. Semi-realistic 3D, clean and readable, not photographic, not cluttered.
Greek celestial theme told through geometry, never a human figure.
```

## Helios (server icon) + `helios-icon.png`

```
[SHARED STYLE BLOCK]

Icon for HELIOS, a high-performance game-streaming SERVER: the source that captures the
game and emits the stream.

Elements (as in the reference):
- Circular solar-gold ring (#F5B82E, highlights #FFEBB0, shadows #A9650F) with a thin
  inner engraved line, and three small amber (#FFC861) diamond studs at top, bottom and
  left.
- Center: a large octagonal fire-opal / ruby gem (#FF6B1A core fading to #E0263B, dark
  edge #5E0818) in a gold bezel, with an inner octagon table facet.
- LEFT half: sharp gold sun rays, alternating long and short, radiating from the gem to
  the ring.
- RIGHT half: the rays become three glowing molten-orange waves (#FFC861 to #FF6B1A)
  that leave the gem and flow out through the ring to the right, fading out. This is
  the stream being emitted ("PyroWave": fire turned into a signal).
Background: obsidian with a warm ember radial glow (#3A1A06) behind the emblem.
Mood: hot, powerful, fast, low latency.
```

## Selene (client icon) + `selene-icon.png`

```
[SHARED STYLE BLOCK]

Icon for SELENE, a game-streaming CLIENT app for Android: it receives the stream from
the sun and displays it, the way the moon reflects sunlight.

Elements (as in the reference):
- Circular polished silver/platinum ring (#D9DEE8, highlights #FFFFFF, shadows #7C879C),
  same thickness and construction as the Helios ring, with three small amethyst
  (#8B5CF6) diamond studs at top, bottom and right (mirror of Helios).
- A large crescent moon in brushed silver on the right, opening to the left, its inner
  edge lit by a thin cyan (#5CE1FF) glow line.
- Cradled in the crescent's hollow, slightly left of center: an octagonal sapphire gem
  (#5CE1FF core fading to #2F5BFF, dark edge #121A5A) in a silver bezel, same cut as the
  Helios gem.
- LEFT side: three glowing waves arrive from outside the ring and enter the gem. They
  start ember orange (#FF6B1A, faint) and cool into cyan (#5CE1FF to #C8F6FF): the sun's
  light received and reflected.
Background: obsidian with a cool deep-blue radial glow (#0B2346) behind the emblem.
Mood: calm, precise, smooth, crystal-clear image.
```

## The pair (consistency check) + `helios-selene-lockup.png`

```
[SHARED STYLE BLOCK, except: this one is a 2:1 brand banner, text allowed]

Brand banner 2048x1024 showing both icons' emblems side by side, as in the reference:
HELIOS (gold sun with ruby gem) on the left, SELENE (silver crescent with sapphire gem)
on the right. One continuous set of three glowing waves runs from the Helios gem to the
Selene gem, orange on the sun side, turning into cyan on the moon side. Both emblems must
share the same ring thickness, bevel style, stud shape, gem cut and lighting, so they read
as one family. Under each emblem its name in classical high-contrast serif capitals,
wide letter spacing: "HELIOS" in gold, "SELENE" in silver. Obsidian background.
```

## Negative prompt (when supported)

```
rounded corners, border, frame around the canvas, text on the icon, letters, watermark,
triangle emblem, triforce, Zelda, Nintendo, Sunshine logo, Moonlight logo, human face,
goddess figure, photo of the real sun or moon, cartoon, clipart, flat emoji, cluttered
background, extra elements not in the reference, elements outside the safe zone,
asymmetric ring thickness between the two icons
```

## Optional follow-up prompt (once a direction is chosen)

```
Using the image you produced, create a FLAT version of the same icon for small sizes and
the Android 13+ themed (monochrome) icon: single white shape on transparent background,
same silhouette (ring, gem outline, rays or crescent, three waves), no gradients, no
glow, minimum stroke 4% of the canvas width.
```

## How to pick the winner

1. Shrink to 48 px: is it still clearly a sun (Helios) and a moon (Selene)?
2. Put both side by side: same family (ring, gem cut, studs, lighting)?
3. Grayscale: does the silhouette still work?
4. From a distance: orange reads as Helios, cyan reads as Selene?
5. Did the model keep the reference layout, or invent a different composition?
