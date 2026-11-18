# FSR 1 upscaling for PyroWave

Status: **planning**. Nothing described here is implemented yet.

This document plans an optional client-side upscaler for the PyroWave path in
[Selene Game Streaming](https://github.com/eumarcodev/Selene-Game-Streaming), using AMD FSR 1 (EASU + RCAS).
Scope for now is **PyroWave only**. Other codecs (HEVC, H.264, AV1) are out of scope, see "Later".

## Why FSR 1, and why on the client

- FSR 2/3/4 and Frame Generation need motion vectors and depth from the game. Helios captures the desktop and has
  neither, so they cannot be used. Upscaling on the server before encoding would only cost bitrate.
- FSR 1 is spatial: it needs only the image, runs on any GPU with shaders (including Mali and Adreno), and is
  MIT licensed (repository `GPUOpen-Effects/FidelityFX-FSR`, copyright AMD).
- PyroWave decode time grows with resolution (measured on the Redmi tablet: about 8 ms at 1280x720, 21 ms at
  1920x1200, 33 ms at 2560x1600). Streaming at a lower resolution and upscaling on the client cuts decode time and
  frame size. Because Helios uses a virtual display at the requested resolution, the host also renders fewer pixels.
- Selene already presents PyroWave frames with its own Vulkan pipeline (`pyrowave-android/src/main/cpp/pyrowave_player.cpp`,
  linear sampler and aspect-fit scaling). The upscaler replaces that sampling step.

## Design

- Two compute passes in the player: EASU (decoded image to an intermediate image at the swapchain size), then RCAS
  (sharpen) into the swapchain image. Shader source comes from FSR 1 (`ffx_a.h` and `ffx_fsr1.h`, GLSL).
- fp16 and fp32 shader variants, picked from the device features.
- Keep the current linear path as the fallback when the option is off or the device lacks compute support.
- The shader stage takes an input image and does not know the codec, so other backends can reuse it later.
- Server: no protocol change. A lower stream resolution is just a smaller resolution request from the client.
  Check that SudoVDA and the PyroWave encoder handle arbitrary resolutions.

## Server check: arbitrary stream resolutions (done)

Checked on 2026-11-18 with Helios 1.11.0 and a Redmi Pad 2 (2560x1600 panel), isolated virtual display on, PyroWave
4:2:0 at 60 fps, an animated page on the streamed display:

| Requested | Streamed | Result |
| --- | --- | --- |
| 1920x1200 (75%) | same | 60 fps |
| 1712x1072 (67%) | same | 60 fps |
| 1280x800 (50%) | same | 60 fps |
| 1366x768 | same | 60 fps |
| 2560x1080 (21:9) | same | about 49 fps, limited by the tablet GPU (present step), not by the host |
| 1715x1071 | 1714x1070 | 60 fps once Selene asks for an even size |

- SudoVDA creates the virtual display at every size above, odd sizes included.
- The PyroWave encoder needs an even width and height for 4:2:0 and refuses an odd size (`PyroWave: unsupported size`),
  which ended the stream. Selene now rounds the requested size down to even numbers when PyroWave is on
  (Selene-Game-Streaming PR 83), so a scale option only has to produce any size and the client fixes the parity.
- No server change was needed.

## Phases

| Phase | Goal | Done when |
| --- | --- | --- |
| 0 Spike | Port EASU and RCAS into `pyrowave_player.cpp` behind a debug flag | GPU ms measured on the tablet for 1280x720 to 1920x1200 and 1920x1080 to 2560x1600, and a visual comparison with the linear path at 60 Mbps |
| 1 Player | Clean implementation: pipelines, intermediate image, fp16/fp32, resize handling | Stream works with the option on and off, no validation-layer errors |
| 2 Settings | Selene option "Upscaling: off / FSR 1", sharpness control, stream scale (for example 75%, 67%, 50%) | Scale option requests a smaller resolution from Helios |
| 3 Tuning | Default sharpness and scale, desktop text and game content | Defaults chosen from side-by-side captures |
| 4 Tests and docs | Reference-image test for the shader output, per-frame GPU cost budget, user docs | Docs updated in both repositories |

Phase 0 decides whether to continue. Stop if the extra GPU cost is larger than the decode time saved, or if the
upscaled image is clearly worse than the linear one.

## Risks

- PyroWave artifacts at low bitrate (soft, blocky) can be amplified by EASU and RCAS. Start with low sharpness.
- FSR 1 was designed for game content. Desktop text at low resolution may look worse.
- Extra GPU load and power draw on the phone or tablet, on top of an already compute-heavy decoder.
- Quality and cost vary across GPU families. The spike runs on one device (Redmi tablet) only.

## Later (out of scope now)

- HEVC, H.264 and AV1: the MediaCodec path writes straight to a `Surface`, so it needs a GL ES (`SurfaceTexture`)
  or Vulkan (AHardwareBuffer) renderer first. Only worth it if phase 0 and 1 show a clear gain and the added latency
  is small.
- FSR 4 (ML) and Frame Generation: need engine data that streaming does not have. Revisit only if a desktop client
  exists.

## Open questions

- License terms of the FSR SDK 2.4 are not confirmed. The plan uses FSR 1 under MIT.
- Which default scale is best for each resolution and network?
