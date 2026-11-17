# Streaming guide: tested setup, recommended settings and troubleshooting

This guide collects what was measured while tuning Helios and [Selene](https://github.com/eumarcodev/Selene-Game-Streaming)
on a real setup, the settings that worked best there, and how to find the right settings for your own network
with the Selene performance overlay.

## Tested setup

| | |
|---|---|
| **Host PC** | AMD Ryzen 7 5700X, AMD Radeon RX 9070 XT (driver 32.0.32015.16001), 32 GB RAM, Windows 11 Pro (build 26340) |
| **Host software** | Helios 1.8 (HEVC encoder `hevc_amf`), virtual display 1920x1080 at 60 Hz |
| **Client** | Xiaomi Redmi Pad 2 (MediaTek MT8781, Mali-G57 MC2, 8 GB RAM), HyperOS 3.0 (Android 16), decoder `c2.mtk.hevc.decoder` |
| **Client software** | Selene 1.6 |
| **Network** | Host wired at 1 Gbit/s to the router; tablet on Wi-Fi 5 (802.11ac), 5 GHz channel 149, link 433 Mbit/s, RSSI -22 dBm, less than 1 m from the router |
| **Stream** | 1920x1080, 60 FPS, stereo audio |

Test loads (scripts run on the host while streaming):

- **Game-like load**: full-screen noise that changes every frame plus a frame counter (high bitrate, worst case).
- **Quality picture**: a real game frame with a text panel, still or scrolling 4 px per frame. The tablet screenshots
  are compared with the original picture (SSIM and PSNR of the luma, higher is better).
- **Video**: a 4K nature video on YouTube in full screen (real motion and fine detail).

## Results

### Audio

| | Before (Helios 1.6, Selene 1.3) | After (Helios 1.7, Selene 1.4) |
|---|---|---|
| PyroWave, full motion | 3 to 8 audio stalls of 150-210 ms every 40 s | 0 stalls in 60 s, 2 stalls of 33 ms in 5 min |

Cause: Helios marked audio as DSCP 56, which Wi-Fi maps to the Voice queue. On this router and tablet that queue
(and best effort) stalled for ~200 ms under heavy video traffic, while the video queue (DSCP 40) never did. Audio now
uses the video class by default (`audio_qos = video`), and Selene drops only the late packets and catches up by
playing 6% faster instead of flushing the audio queue.

### Video, game-like load (60 s, 60 Mbit/s requested)

| | HEVC | PyroWave (60 Mbit/s) |
|---|---|---|
| Speed | 56.8 Mbit/s | 47.8 Mbit/s |
| Frames | 60.1 FPS | 57.5 FPS |
| Frame arrival | jitter 2.7 ms, longest gap 26 ms | jitter 6.8 ms, longest gap 34 ms |
| Video loss | 0.0% | 0.0% |
| Audio | 0 lost, 4 stalls of ~31 ms | 0 lost, 3 stalls of ~32 ms |

### PyroWave picture quality

PyroWave codes every frame on its own (no reference frames), which gives the lowest latency and makes every frame
recoverable, but at the same bitrate it is less sharp than HEVC. Measured on the quality picture:

| Setting | Text, still (SSIM) | Game, still (PSNR) | Text, scrolling (SSIM) |
|---|---|---|---|
| HEVC, 60 Mbit/s | 0.964 | 41.6 dB | 0.959 |
| PyroWave, 60 Mbit/s | 0.943 | 36.0 dB | 0.942 |
| PyroWave, 100 Mbit/s | 0.953 | 37.6 dB | 0.949 |
| PyroWave, 150 Mbit/s | 0.957 | 38.9 dB | 0.953 |
| **PyroWave, 150 Mbit/s + sharper still screen** | **0.964** | **42.2 dB** | 0.953 |

- PyroWave needs about 2.5 times the HEVC bitrate for a similar picture in motion. Selene 1.6 picks that by
  default for PyroWave streams ("PyroWave bitrate: Automatic", 2.5 times the video bitrate, up to 150 Mbit/s).
- On a still screen HEVC refines the picture over time; Helios 1.8 does the same for PyroWave with the "sharper still
  screen" option (`pyrowave_static_boost`): the few frames repeated per second while nothing changes get 4 times the budget,
  and the still picture ends up sharper than HEVC without going over the bitrate.
- At 150 Mbit/s this Wi-Fi 5 link carried 141 to 152 Mbit/s at 60 FPS with 0% loss and no audio stall, in the game
  load, the scrolling picture and the video.

## Recommended settings

Measured on the setup above; the other rows are starting points to check with the overlay.

| Network | Codec | Bitrate | Notes |
|---|---|---|---|
| Wired, or Wi-Fi 5/6 with a link of 400 Mbit/s or more and a good signal (RSSI above -60 dBm) | PyroWave for the lowest latency | PyroWave: Automatic (150 Mbit/s) | Measured: 0% loss, no audio stalls. HEVC 60 Mbit/s if you prefer bandwidth over latency |
| Wi-Fi 5 with a weaker link (200 to 400 Mbit/s, or RSSI -60 to -70 dBm) | PyroWave or HEVC | PyroWave 60 to 100 Mbit/s, HEVC 30 to 50 Mbit/s | Lower the PyroWave bitrate if the overlay shows loss |
| Wi-Fi 2.4 GHz, a far access point, or a busy network | HEVC | 15 to 30 Mbit/s | PyroWave needs a lot of bandwidth |
| Remote (internet) | HEVC or AV1 | What the upload allows, usually 10 to 20 Mbit/s | PyroWave is not meant for this |

Host (Helios web UI) defaults that worked best:

- `audio_qos = video` (Network tab). Try `disabled` if your router misbehaves with DSCP marks.
- `pyrowave_static_boost = enabled` (PyroWave tab).
- Everything else at its default.

Client (Selene) settings:

- **PyroWave bitrate**: Automatic. Pick a fixed value to match your network (see the table).
- **Sharper still screen**: Host setting (on by default in Helios).
- **Maximum frame size** and **packet size**: leave on automatic unless the overlay shows loss at high bitrates.
- Turn on the **performance overlay** while you tune: every number below comes from it.

## Troubleshooting

| Symptom | What the overlay shows | What to try |
|---|---|---|
| Audio cuts or crackles | "Late audio: N stalls (longest 150-200 ms)" | Update to Helios 1.7 / Selene 1.4 or later. Keep `audio_qos = video`; if it continues, try `disabled`. Check that WMM is on in the router |
| Short audio and video freezes (~140 ms) only when the screen barely moves (desktop, menus), mostly HEVC | "Late audio" stalls of ~140 ms and "Frame arrival: longest gap" of ~140 ms, no loss | Wi-Fi power saving on some Android devices (Selene #56, seen on a MediaTek tablet). It comes and goes and disappears with motion on screen. Keep the device on the charger and the stream in the foreground |
| PyroWave looks blurry | "PyroWave bitrate" line, "Speed" well below the bitrate | Raise "PyroWave bitrate" (Automatic or a fixed higher value), leave "Sharper still screen" on, and make sure "Maximum frame size" is not limiting |
| Picture breaks up or freezes at high bitrates | "Loss: incomplete frames" or "packets" above 1% | Lower the PyroWave bitrate (100, then 60 Mbit/s), then try a maximum frame size of 256 KB or a packet size of 1000 bytes |
| Stutter with no loss | "Frame arrival: jitter" above ~10 ms or a long "longest gap" | Wi-Fi interference: use 5 GHz, get closer to the router, avoid other heavy traffic on the same network |
| PyroWave can't keep up on the device | "Decode" in red, "skipped" frames | Lower the resolution or use HEVC; the decoder needs more time than one frame |
| The app closed on a very busy HEVC screen | (crash) | Fixed in Selene 1.5: a frame larger than the decoder input buffer is dropped and a new one requested |
