<p align="center">
  <img src="branding/helios-icon.png" width="160" alt="Helios icon">
</p>

# Helios

Helios is a self-hosted desktop stream host for [Selene Game Streaming](https://github.com/eumarcodev/Selene-Game-Streaming) (the Android client of this project), [Artemis (Moonlight Noir)](https://github.com/ClassicOldSong/moonlight-android) and Moonlight clients. Offering low latency, native client resolution, cloud gaming server capabilities with support for AMD, Intel, and Nvidia GPUs for hardware encoding. Software encoding is also available. A web UI is provided to allow configuration and client pairing from your favorite web browser. Pair from the local server or any mobile device.

Major features:

- [x] Built-in Virtual Display with HDR support that matches the resolution/framerate config of your client automatically
- [x] Permission management for clients
- [x] Clipboard sync
- [x] Commands for client connection/disconnection (checkout [Auto pause/resume games](https://github.com/ClassicOldSong/Apollo/wiki/Auto-pause-resume-games))
- [x] Input only mode

## Lineage and credits

This project is an independent fork. Its names continue a family of names: the host is **Helios** (the sun) and the Android client is **Selene Game Streaming** (the moon), following the lineage below.

<p align="center">
  <img src="branding/helios-selene.png" width="600" alt="Helios and Selene icons joined by the stream">
</p>

The icons tell the same story: Helios, the sun, emits the stream (orange waves leaving the ruby core), and Selene, the moon, receives it and reflects it (the waves cool into cyan as they reach the sapphire). Sources and the generator live in [`branding/`](branding).

| Project | Role | Name origin | Authors |
|---------|------|-------------|---------|
| [Moonlight](https://github.com/moonlight-stream) | Original open-source client for NVIDIA GameStream | Moon | Cameron Gutman and the Moonlight contributors |
| [Sunshine](https://github.com/LizardByte/Sunshine) | Self-hosted GameStream-compatible host | Sun | Elia Zammuto (original author), then LizardByte and contributors |
| [Apollo](https://github.com/ClassicOldSong/Apollo) | Sunshine fork with virtual display (SudoVDA), per-client permissions and clipboard sync | Greek god of the sun | ClassicOldSong |
| [Artemis (Moonlight Noir)](https://github.com/ClassicOldSong/moonlight-android) | Moonlight Android fork that pairs with Apollo | Greek goddess of the moon | ClassicOldSong |
| [**Helios**](https://github.com/eumarcodev/Helios-Server) | This project, the host (fork of Apollo) | Greek personification of the sun, older than Apollo | Maintained by [eumarcodev](https://github.com/eumarcodev) |
| [**Selene Game Streaming**](https://github.com/eumarcodev/Selene-Game-Streaming) | This project, the Android client (fork of Artemis) | Greek personification of the moon, older than Artemis | Maintained by [eumarcodev](https://github.com/eumarcodev) |

Sunshine and Moonlight pair as sun and moon, Apollo and Artemis as the twin gods, and Helios and Selene go one generation further back, to the Titans they descend from.

### Thanks

Almost everything here exists because of other people's work, and we are grateful to:

- **ClassicOldSong**, for Apollo, Artemis and SudoVDA, which are the base of this fork.
- **LizardByte** and every Sunshine contributor, and **Elia Zammuto**, for creating Sunshine.
- **Cameron Gutman** and the **Moonlight** contributors, for the client, the streaming protocol work and `moonlight-common-c`.
- Everyone who reported issues, sent patches or documented the quirks of game streaming along the way.

This fork keeps the original license (GPLv3) and the copyright notices of the upstream projects. The upstream history is preserved in this repository's git log.

## Usage

Refer to LizardByte's documentation hosted on [Read the Docs](https://docs.lizardbyte.dev/projects/sunshine) for now.

The wiki links below point to the documentation of the upstream Apollo project, which this fork does not have yet. Most of it still applies to Helios.

Currently Virtual Display support is Windows only, Linux support is planned and will be implemented in the future.

## About Permission System

Check out the [Wiki](https://github.com/ClassicOldSong/Apollo/wiki/Permission-System)

> [!NOTE]
> The **FIRST** client paired with Helios will be granted with FULL permissions, then other newly paired clients will only be granted with `View Streams` and `List Apps` permission. If you encounter `Permission Denied` error when trying to launch any app, go check the permission for that device and grant `Launch Apps` permission. The same applies to the situation when you find that you can't move mouse or type with keyboard on newly paired clients, grant the corresponding client `Mouse Input` and `Keyboard Input` permissions.

## About Virtual Display

> [!WARNING]
> ***It is highly recommend to remove any other virtual display solutions from your system and Helios/Sunshine config, to reduce confusions and compatibility issues.***

> [!NOTE]
> **TL;DR** Just treat your Selene/Artemis/Moonlight client like a dedicated PnP monitor with Helios.

Helios uses SudoVDA for virtual display. It features auto resolution and framerate matching for your Selene/Artemis/Moonlight clients. The virtual display is created upon the stream starts and removed once the app quits. **If you do not see a new virtual display added or removed when the stream starts or stops, there may be a driver misconfiguration, or another persistent virtual display might still be active.**

The virtual display works just like any physically attached monitors with SudoVDA, there's completely no need for a super complicated solution to "fix" resolution configurations for your devices. Unlike all other solutions that reuses one identity or generate a random one each time for any virtual display sessions, **Helios assigns a fixed identity for each Selene/Artemis/Moonlight client, so your display configuration will be automatically remembered and managed by Windows natively.**

## Configuration for dual GPU laptops

Helios supports dual GPUs seamlessly.

If you want to use your dGPU, just set the `Adapter Name` to your dGPU and enable `Headless mode` in `Audio/Video` tab, save and restart your computer. No dummy plug is needed any more, the image will be rendered and encoded directly from your dGPU.

## About HDR

HDR starts supporting from Windows 11 23H2 and generally supported on 24H2. Some systems might not have HDR toggle on 23H2 and you just need to upgrade to 24H2. Any system lower than 23H2/Windows 10 will not have HDR option available.

> [!NOTE]
> The below section is written for professional media workers. It doesn't stop you from enabling HDR if you know what you're doing and have deep understanding about how HDR works.
>
> Helios and SudoVDA can handle HDR just fine like any other streaming solutions.
>
> If you have had good experience with HDR previously, you can safely ignore this section.
>
> If you're curious, read on, but don't blame Helios for poor HDR support.

Whether HDR streaming looks good, it depends completely on your client.

In short, ICC color correction should be totally useless while streaming HDR. It's your client's job to get HDR content displayed right, not the host. But in fact, it does affect the captured video stream and reflect changes on devices that can handle HDR correctly. On other devices that can't, the info is not respected at all.

It's very complicated to explain why HDR is a total mess, and why enabling HDR makes the image appear dark/yellow. If it's your first time got HDR streaming working, and thinks HDR looks awful, you're right, but that's not Apollo's fault, it's your device that tone mapped SDR content to the maximum of the capability of its screen, there's no headroom for anything beyond that actual peak brightness for HDR. For details, please take a look [here](https://github.com/ClassicOldSong/Apollo/issues/164).

For client devices, usually Apple products that have HDR capability can be trusted to have good results, other than that, your luck depends.

<details>
<summary>DEPRECATION ALERT</summary>

Enabling HDR is **generally not recommended** with **ANY streaming solutions** at this moment, probably in the long term. The issue with **HDR itself** is huge, with loads of semi-incompatible standards, and massive variance between device configurations and capabilities. Game support for HDR is still choppy.

SDR actually provides much more stable color accuracy, and are widely supported throughout most devices you can imagine. For games, art style can easily overcome the shortcoming with no HDR, and SDR has pretty standard workflows to ensure their visual performance. So HDR isn't *that* important in most of the cases.

</details>

## How to run multiple instances of Helios for multiple virtual displays

Follow the instructions in the [Wiki](https://github.com/ClassicOldSong/Apollo/wiki/How-to-start-multiple-instances-of-Apollo).

## Tested setup, recommended settings and troubleshooting

[docs/streaming-guide.md](docs/streaming-guide.md) has the setup Helios and Selene were tuned on (Ryzen 7 5700X + RX 9070 XT host, wired; Redmi Pad 2 on Wi-Fi 5), the measured results (audio stalls, video loss, PyroWave picture quality against HEVC), the settings that worked best per kind of network, and a troubleshooting table based on what the Selene performance overlay shows.

Summary of that setup at 1920x1080, 60 FPS:

| | HEVC 60 Mbit/s | PyroWave 150 Mbit/s + sharper still screen |
|---|---|---|
| Still picture (PSNR) | 41.6 dB | 42.2 dB |
| Text in motion (SSIM) | 0.959 | 0.953 |
| Video loss / audio stalls | 0% / none | 0% / none |

## FAQ
Moved to [WiKi](https://github.com/ClassicOldSong/Apollo/wiki/FAQ)

## Stuttering Clinic
Here're some common causes and solutions for stutters: [WiKi](https://github.com/ClassicOldSong/Apollo/wiki/Stuttering-Clinic).

## Device specific setups
- Pixel devices might not be able to use native resolution:
  - Change the device resolution to Max: https://github.com/ClassicOldSong/Apollo/issues/700

## System Requirements

> **Warning**: This table is a work in progress. Do not purchase hardware based on this.

**Minimum Requirements**

| **Component** | **Description** |
|---------------|-----------------|
| GPU           | AMD: VCE 1.0 or higher, see: [obs-amd hardware support](https://github.com/obsproject/obs-amd-encoder/wiki/Hardware-Support) |
|               | Intel: VAAPI-compatible, see: [VAAPI hardware support](https://www.intel.com/content/www/us/en/developer/articles/technical/linuxmedia-vaapi.html) |
|               | Nvidia: NVENC enabled cards, see: [nvenc support matrix](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new) |
| CPU           | AMD: Ryzen 3 or higher |
|               | Intel: Core i3 or higher |
| RAM           | 4GB or more |
| OS            | Windows: 10+ (Windows Server requires [manual installation](https://github.com/nefarius/ViGEmBus/issues/153) for gamepad support) |
|               | macOS: 12+ |
|               | Linux/Debian: 11 (bullseye) |
|               | Linux/Fedora: 39+ |
|               | Linux/Ubuntu: 22.04+ (jammy) |
| Network       | Host: 5GHz, 802.11ac |
|               | Client: 5GHz, 802.11ac |

**4k Suggestions**

| **Component** | **Description** |
|---------------|-----------------|
| GPU           | AMD: Video Coding Engine 3.1 or higher |
|               | Intel: HD Graphics 510 or higher |
|               | Nvidia: GeForce GTX 1080 or higher |
| CPU           | AMD: Ryzen 5 or higher |
|               | Intel: Core i5 or higher |
| Network       | Host: CAT5e ethernet or better |
|               | Client: CAT5e ethernet or better |

**HDR Suggestions**

| **Component** | **Description** |
|---------------|-----------------|
| GPU           | AMD: Video Coding Engine 3.4 or higher |
|               | Intel: UHD Graphics 730 or higher |
|               | Nvidia: Pascal-based GPU (GTX 10-series) or higher |
| CPU           | AMD: todo |
|               | Intel: todo |
| Network       | Host: CAT5e ethernet or better |
|               | Client: CAT5e ethernet or better |

## Integrations

SudoVDA: Virtual Display Adapter Driver used in Helios

[Artemis](https://github.com/ClassicOldSong/moonlight-android): Integrated Virtual Display options control from client side

**NOTE**: Artemis currently supports Android only. Selene Game Streaming, the Android client of this project, is being prepared.

## Support

Support is provided via [GitHub Issues](https://github.com/eumarcodev/Helios-Server/issues) and [Discussions](https://github.com/eumarcodev/Helios-Server/discussions).

## Downloads

### Direct Download

**Recommended**

[Releases](https://github.com/eumarcodev/Helios-Server/releases)

### Package managers

The WinGet and Chocolatey packages that exist today install the upstream Apollo, not Helios. Helios is only distributed through the releases above for now.

## About this fork

Helios started as a fork of [Apollo](https://github.com/ClassicOldSong/Apollo). Since the original project is no longer being updated, this fork continues independently, with its own releases, update channels and roadmap.

It is not affiliated with LizardByte, Moonlight, Apollo or Artemis. Compatibility with OG Sunshine and OG Moonlight clients is kept where possible, but is not guaranteed.

Pull requests and ideas are welcome.

Work in progress: integrating the low-latency [PyroWave](https://github.com/Themaister/pyrowave) codec. See [docs/pyrowave-integration.md](docs/pyrowave-integration.md) and the [project board](https://github.com/users/eumarcodev/projects/5).

## License

GPLv3
