# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Apollo is a fork of LizardByte Sunshine (a self-hosted game-stream host for Moonlight/Artemis clients), adding virtual display (SudoVDA), per-client permissions and clipboard sync. This checkout is the fork `eumarcodev/Helios-Server` (renamed on GitHub from `eumarcodev/Apollo`, which still redirects; upstream: `ClassicOldSong/Apollo`). Much of the code, docs and CMake still use the `sunshine` name (`config::sunshine`, `test_sunshine`, `sunshine.exe`).

## Naming decision (independent fork)

The fork is now independent of upstream (the original maintainer stopped updating). Decided names, continuing the sun/moon lineage Sunshine/Moonlight → Apollo/Artemis → Helios/Selene:
- Server (this repo, currently still "Apollo" in code): **Helios**.
- Android client (currently `moonlight-android`/Artemis): **Selene Game Streaming**.
- README keeps the credits and lineage section (ClassicOldSong, LizardByte/Sunshine, Moonlight); keep it when renaming. Don't use Nintendo/Zelda names.
- The rename of repo, binaries, installer, CMake, web UI strings, mDNS name, config paths (with migration) and `APOLLO_UPDATE_REPO` is a separate, pending step; until it lands, code and docs still say Apollo/Sunshine.

## Build (Windows, MSYS2 UCRT64)

All C++ builds run inside MSYS2 UCRT64 (GCC, Ninja). From PowerShell/Bash prefix commands with
`C:\msys64\msys2_shell.cmd -defterm -here -no-start -ucrt64 -c "<cmd>"`. Use `cmake-build-*` or `build` as the build dir.

```bash
cmake -B build -G Ninja -S .          # add -DBUILD_TESTS=ON for tests
ninja -C build
cpack -G NSIS --config build/CPackConfig.cmake   # installer (Apollo.exe); -G ZIP for portable
```

Gotchas learned the hard way:
- Set `PROCESSOR_ARCHITECTURE=AMD64` in the environment, otherwise the prebuilt FFmpeg path resolves to `third-party/build-deps/dist/Windows-` and fails.
- `node.exe` (Windows Node, not the MSYS2 package) must be on `PATH` for the `web-ui` target.
- Boost: `cmake/dependencies/Boost_Sunshine.cmake` pins an EXACT version (`find_package(Boost CONFIG ... EXACT)`). If the MSYS2 system Boost doesn't match, it falls back to FetchContent, which builds Boost from source and (with CMake 4.x) fails in Boost.Locale on `source_group` unless the patch `cmake/dependencies/patch_boost_locale.cmake` applies. Keep `BOOST_VERSION` aligned with the MSYS2 package version to avoid the fallback (slow, and CI runners rebuild it every time).
- `BUILD_VERSION` and `BRANCH` environment variables make `cmake/prep/build_version.cmake` set `PROJECT_VERSION`. The value may carry a suffix (`1.2.0-nightly.20261115`); CMake extracts `X.Y.Z` for resource files while the full string is embedded as ProductVersion.
- `APOLLO_UPDATE_REPO` (CMake cache var, default `ClassicOldSong/Apollo`) is compiled in and exposed by `/api/config` as `update_repo`; CI passes the fork's repository.

## Tests

- C++ (gtest, `-DBUILD_TESTS=ON`): executable `test_sunshine` in `build/tests/`. Single test: `build/tests/test_sunshine --gtest_filter=Suite.Name`. Sources in `tests/unit`.
- Web helpers (Node `node:test`): `npm run test:web` (files in `tests/web/*.test.mjs`).
- Web UI build: `npm run build` (Vite); Vue sources in `src_assets/common/assets/web`.
- C/C++ style follows `.clang-format`.

## Architecture (big picture)

- `src/main.cpp` boots subsystems; `src/nvhttp.cpp` (GameStream-compatible pairing/launch HTTPS), `src/rtsp.cpp` and `src/stream.cpp` (RTSP + RTP/UDP streaming), `src/confighttp.cpp` (web UI backend and `/api/*`; auth is cookie-based via `POST /api/login`), `src/process.cpp` (apps, commands), `src/input.cpp`.
- Capture/encode lives in `src/video.cpp` plus per-platform code in `src/platform/{windows,linux,macos}`. Encoders are FFmpeg-based (`avcodec_encode_session_t`) or NVENC (`src/nvenc`). Virtual display and display-device handling: `src/display_device.cpp` and the Windows platform code.
- `src/config.h` / `src/config.cpp` define every option. `config::sunshine` is initialised **positionally** in `config.cpp`, so a new field must be added in the same order in both files. Options are read in `config::parse`, and each needs a default in the web UI (`src_assets/common/assets/web/config.html`), a control in `configs/tabs/*.vue`, a locale key in `public/assets/locale/en.json`, and a section in `docs/configuration.md`.
- Web UI: Vue 3 + Vite under `src_assets/common/assets/web`, built into the installed assets. `index.html` hosts the update banner; `apollo_version.js` parses and orders versions.
- AMD AMF encoders can hang forever in the FFmpeg flush at session teardown (`amfrtdrv64.dll`); `~avcodec_encode_session_t` in `src/video.cpp` therefore skips the flush for `*_amf` codecs. Don't reintroduce it.
- Local test instances can't use some port ranges on Windows (e.g. 51000/51021 hit "forbidden by access permissions", reserved ranges); use default ports.

## Releases and update channels

Documented in full in `.github/RELEASING.md`. Summary:
- Channels: **nightly** (`develop`, daily 03:00 Brasilia via `nightly.yml`, last 7 kept), **RC** (push to `release/X.Y` or `hotfix/X.Y.Z` via `rc.yml`, tags `vX.Y.Z-rc.N`), **stable** (tag `vX.Y.Z` on `master` via `stable.yml`). `cut-release.yml` (manual) creates the branches. Reusable build is `build.yml`; `pr.yml` only builds when code paths change or the PR has the `build` label.
- Versions come from branch/tag names, not commit messages. Nightly is one minor above the highest stable/rc tag, so it is always newer than the RC in progress. Ordering: `nightly < beta < rc < stable` for equal `X.Y.Z`.
- Branches: `master` = what was released, `develop` = integration (PRs go here after the first release), `release/X.Y` only for fixes. `develop` must never be created from a stale local `master` (it caused a nightly to build without fixes); create or move it from `origin/master`.
- Pushes made with `GITHUB_TOKEN` do not trigger other workflows, so `cut-release` dispatches `rc.yml` explicitly. Scheduled workflows run from the default branch and GitHub pauses them after 60 days without activity. The stable `sync-back` job needs the repo setting "Allow GitHub Actions to create and approve pull requests".
- The home page picks the newest release for the channel set in `update_channel` (`stable|rc|nightly`, empty = follow the installed version); legacy `notify_pre_releases` behaves like `rc`.

## Git and PR conventions

- Commits and PRs in this fork are authored as `eumarcodev` (GitHub noreply email `3676046+eumarcodev@users.noreply.github.com`, configured via `includeIf` for repos under this path); don't let the "Azure Pipeline" default identity through.
- PRs follow `.github/PULL_REQUEST_TEMPLATE.md` (Problem / Changes / Testing / Notes / AI usage), modeled on upstream PR #1621. Be honest in Testing about what was not run. Commit messages use Conventional Commits (`feat(web):`, `ci:`, `docs(github):`); one commit per logical phase is preferred.
- `gh` is installed at `C:\Program Files\GitHub CLI\gh.exe` and is not on `PATH`.
- Platform-specific notes: Linux/macOS code paths exist but are only built upstream; this fork is developed and tested on Windows (streaming verified with the Artemis client on an AMD RX 9070 XT).
