# PyroWave integration

Status: **planning**. Nothing described here is implemented yet.

This document describes how the [PyroWave](https://github.com/Themaister/pyrowave) codec will be integrated into
Helios (server) and [Selene Game Streaming](https://github.com/eumarcodev/Selene-Game-Streaming) (Android client).
Progress is tracked in the [PyroWave Integration project](https://github.com/users/eumarcodev/projects/5),
with issues in both repositories labelled `pyrowave`.

## Why PyroWave

PyroWave is an intra-only video codec implemented entirely as Vulkan compute shaders. It is designed for
local-network game streaming where bandwidth is plentiful and latency is the priority.

- Encode and decode take well under a millisecond per frame on a desktop GPU (about 0.1 ms at 1080p, per the project).
- Every frame is independent, so there are no reference frames, no IDR requests and no long recovery after packet loss.
- Frames are split into independent 64x64 coefficient blocks, so a lost packet only degrades the region it carried.
- The encoder can target an exact maximum size per frame.
- The trade-off is bitrate: the targeted range is roughly 200 Mbit/s and above.

This makes PyroWave an optional low-latency mode for wired or strong Wi-Fi networks. It does not replace H.264,
HEVC or AV1 for slower links.

## Current state of the work

The fork `eumarcodev/pyrowave` builds on Windows with MSYS2 UCRT64 (GCC, Ninja, CMake 4.x) and produces
`libpyrowave-shared`. On the development machine, these tests pass:

- `pyrowave-c-test` (C API round trip, 8 variants, error handling)
- `pyrowave-c-interop-test` (D3D11, D3D12, NV12, Vulkan to Vulkan, scaled 8-bit and 10-bit encode)
- `pyrowave-device-validation`

The DRM modifier interop test is skipped on Windows, as expected. The standalone build needs a pinned subset of
Granite (`volk` and `Vulkan-Headers`), fetched by `checkout_granite.sh`.

## Architecture

### Server (Helios)

| Area | Where | Change |
| --- | --- | --- |
| Encoder | `src/video.cpp`, `src/video.h` | New `pyrowave_encode_session_t` next to the avcodec and NVENC sessions |
| Capture | `src/platform/windows/display_vram.cpp` | Share the captured D3D11 texture with Vulkan through PyroWave's interop |
| Negotiation | `src/nvhttp.cpp`, `src/rtsp.cpp` | New codec flag in `ServerCodecModeSupport` and a new `bitStreamFormat` value |
| Transport | `src/stream.cpp` | Packetize with the negotiated packet size and send through the existing RTP video channel |
| Config | `src/config.h`, `src/config.cpp`, web UI | New options, following the project's config conventions |

The encoder uses `pyrowave_encoder_encode_gpu_scaled`, so the RGB to YCbCr conversion happens inside PyroWave.
Rate control is a per-frame byte budget derived from the bitrate and frame rate.

### Client (Selene)

| Area | Where | Change |
| --- | --- | --- |
| Protocol | `moonlight-common-c` (`Limelight.h`, `SdpGenerator.c`) | New `VIDEO_FORMAT_PYROWAVE` and SDP negotiation |
| Decoder | `moonlight-core` (native) and a new `VideoDecoderRenderer` | PyroWave decoder instead of MediaCodec |
| Presentation | native Vulkan | Decode into a Vulkan image and present it on the `Surface` with a swapchain |
| Settings | preferences | An experimental option, plus a check for Vulkan 1.1+ and compute support |
| Loss handling | `VideoDepacketizer`, `RtpVideoQueue` | Deliver partial frames instead of dropping them |

### Wire format

The first version reuses the existing Moonlight video channel (RTP, encryption, RTSP). Each PyroWave frame is an
opaque payload split into packets by the encoder, with little or no FEC. A stream header carries width, height,
chroma format and bitstream version. Clients without PyroWave support never see the new format, and keep
using the existing codecs.

## Phases

| Phase | Goal | Notes |
| --- | --- | --- |
| 0 Preparation | Submodule, build integration, proof of concept | Measure latency and bandwidth before changing the protocol |
| 1 Protocol | Negotiation on both sides | Backwards compatible |
| 2 Server | Encode session, rate control, transport, config | Windows only |
| 3 Client | NDK build, decoder, Vulkan presentation, settings | arm64-v8a first |
| 4 Packet loss | Partial frame delivery, FEC tuning | The main advantage of the codec |
| 5 Testing | Real devices, power and latency, documentation | At least three GPU families |

## Known risks

- **Bandwidth.** At around 200 Mbit/s and up, 2.4 GHz Wi-Fi is out, and 5 GHz Wi-Fi depends on the environment.
- **Phone GPU load.** The decoder is compute heavy. Real-device measurements are needed before promising anything.
- **Capture and Vulkan interop.** Frames must not be dropped or corrupted between the D3D11 capture and the Vulkan encode.
- **Moonlight assumptions.** FEC block limits and maximum frame size were designed around H.264-sized frames.
- **HDR and 10-bit.** PyroWave supports them, but Helios has its own HDR path. Out of scope for the first version.

## Open questions

- Which networks should the first release target (wired only, or strong Wi-Fi as well)?
- Is a desktop client needed for faster testing, or is Selene enough?
- Should PyroWave be a submodule of Helios (with Granite pinned), and which license terms apply to redistribution?

## Credits

PyroWave is written by Hans-Kristian Arntzen (Themaister) and is available at
https://github.com/Themaister/pyrowave. Helios uses it through the `eumarcodev/pyrowave` fork.

## Testing on a lossy link

Set `HELIOS_PYROWAVE_LOSS=<percent>` (together with `HELIOS_PYROWAVE=1`) before starting Helios to drop that share of the
PyroWave packets before they are sent. Measured on the Redmi tablet at 1920x1200 and 80 Mbps with a full-screen animation:
5% loss gives a clean-looking picture, 15% loss makes it soft and blocky but it keeps moving and recovers by itself (no
freezes, no key frame request needed). Only single screenshots were inspected, not a quantitative quality measure.
