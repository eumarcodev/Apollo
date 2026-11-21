# CLAUDE.md

Guidance for Claude Code in this repository. Workspace-wide rules (language, bench, issue tracking) live in `../CLAUDE.md`.

Helios is the game-stream host of `eumarcodev/Helios-Server`, an independent fork (lineage and credits in `README.md`),
with virtual display (SudoVDA), per-client permissions, clipboard sync and the PyroWave codec. Its Android client is
Selene (`../Selene-Game-Streaming`). Code, docs, CMake and file names use only the Helios name (`config::helios`,
`test_helios`, `helios.exe`, `heliossvc.exe`, `helios.conf`); the README credits section is the only place that names
the upstream projects.

## 1. Critical commands

All C++ builds run inside MSYS2 UCRT64 (GCC, Ninja). From PowerShell/Bash prefix commands with
`C:\msys64\msys2_shell.cmd -defterm -here -no-start -ucrt64 -c "<cmd>"`. Build dir: `build` or `cmake-build-*`.

```bash
cmake -B build -G Ninja -S . -DBUILD_TESTS=ON
ninja -C build
build/tests/test_helios                                # full suite, required before a PR (baseline: 268 tests, 0 failures)
build/tests/test_helios --gtest_filter=Suite.Name      # single test
# web UI: run inside src_assets/common/assets/web-react (npm ci, then lint, typecheck, test:unit, e2e, build)
cpack -G NSIS --config build/CPackConfig.cmake         # installer Helios.exe; -G ZIP for portable
```

Environment the build needs:
- `PROCESSOR_ARCHITECTURE=AMD64`, otherwise the prebuilt FFmpeg path resolves to `third-party/build-deps/dist/Windows-` and fails.
- Windows `node.exe` (not the MSYS2 package) on `PATH` for the `web-ui` target.
- `HELIOS_ENABLE_PYROWAVE` is ON by default on Windows and needs `third-party/pyrowave` with its nested submodules. Before trusting a PyroWave test, check the host log for `PyroWave: packet size`: without it the stream is HEVC and the measurement means nothing.
- `BUILD_VERSION` and `BRANCH` env vars make `cmake/prep/build_version.cmake` set `PROJECT_VERSION` (suffix like `1.10.0-rc.2` allowed; resources get `X.Y.Z`).
- `gh` is at `C:\Program Files\GitHub CLI\gh.exe` and is not on `PATH`.

## 2. Architecture map

- `src/main.cpp` boots subsystems. `src/nvhttp.cpp`: GameStream-compatible pairing/launch over HTTPS. `src/rtsp.cpp` + `src/stream.cpp`: RTSP and RTP/UDP streaming, including the Helios control-message extensions (0x3000–0x3002, shared with `eumarcodev/moonlight-common-c`). `src/process.cpp`: apps and commands. `src/input.cpp`: input.
- `src/confighttp.cpp`: web UI backend and `/api/*` (cookie auth via `POST /api/login`).
- Capture/encode: `src/video.cpp` plus per-platform code in `src/platform/{windows,linux,macos}`. Encoders are FFmpeg-based (`avcodec_encode_session_t`) or NVENC (`src/nvenc`). Virtual display: `src/display_device.cpp` and the Windows platform code.
- Options: `src/config.h` / `src/config.cpp`, read in `config::parse`.
- Web UI: React 19 + TypeScript + HeroUI v3 + Vite 8 in `src_assets/common/assets/web-react` (vertical slices in `src/features`, tests next to the code, Cypress in `cypress/`; read its `README.md`). The `web-ui` CMake target builds it into `<assets>/web`; `public/images` holds the tray icons the host reads.
- Tests: `tests/unit` (gtest, incl. `test_pyrowave_*`), `tests/integration` (config/locale consistency against the web UI sources); web UI tests run from `web-react` (`npm run test:unit`, `npm run e2e`).
- Dependencies are submodules in `third-party/`; `third-party/pyrowave` and `third-party/moonlight-common-c` are the user's forks (changed by PR in their own repos, then bumped here).
- Release automation: `.github/workflows` (`rc-queue.yml`, `rc.yml`, `stable-queue.yml`, `promote.yml`, reusable `build.yml`), documented in `.github/RELEASING.md`.

Where a new config option belongs (all of them, or it is incomplete): field in `config.h` AND in the same position in `config.cpp`, parsing in `config::parse`, default and control in `src_assets/common/assets/web-react/src/features/config/domain/config-tabs.ts` and the config UI, locale keys in BOTH `src_assets/common/assets/web-react/public/assets/locale/en.json` and `pt_BR.json`, section in `docs/configuration.md` (`test_config_consistency` checks these).

## 3. Hard rules

- **IMPORTANT: `config::helios` is initialised positionally** in `config.cpp`: a new field MUST be added in the same order in `config.h` and `config.cpp`.
- **IMPORTANT: the version file is `version.txt`, NEVER `VERSION`.** The repo root is on the include path and `VERSION` shadows the C++ `<version>` header on Windows.
- **Do NOT reintroduce the FFmpeg flush for `*_amf` codecs** in `~avcodec_encode_session_t` (`src/video.cpp`): AMD AMF hangs forever there at session teardown (`amfrtdrv64.dll`).
- Keep `BOOST_VERSION` in `cmake/dependencies/Boost_Helios.cmake` equal to the MSYS2 Boost package (`find_package(... EXACT)`). A mismatch falls back to FetchContent, which is slow and with CMake 4.x fails in Boost.Locale unless `cmake/dependencies/patch_boost_locale.cmake` applies.
- Branches: `feature/*` from `develop` (the default branch), PR to `develop`. **No `release/*`, `hotfix/*` or nightly.** Never commit directly to `develop` or `master`: the `master-develop` ruleset rejects direct pushes, force-pushes and deletion of both (no bypass, not even for GitHub Actions).
- Commits and PRs are authored as `eumarcodev` (noreply `3676046+eumarcodev@users.noreply.github.com`, set via `includeIf`); do not let the "Azure Pipeline" default identity through.
- Call the product Helios and its protocol additions "Helios extensions"; do not use the upstream projects as a reference or name them outside the README credits. Do not use Nintendo/Zelda names.
- Wire names that clients parse keep their historical spelling on purpose: the serverinfo states `SUNSHINE_SERVER_FREE`/`SUNSHINE_SERVER_BUSY` (`src/nvhttp.cpp`). Do not rename them.
- Upgrades from an older Helios install: `config::migrate_legacy_file` renames the old default config/state/log file names once at startup, `config::migrate_legacy_options` maps old option keys to their current names (the host name is now `helios_name`) and drops removed options, also in `GET /api/config`; the installer runs `scripts/remove-legacy-binaries.bat` for the old executables.
- Local test instances: use the default ports (some Windows ranges such as 51000/51021 fail with "forbidden by access permissions").
- `helios.log` is recreated on every service restart: delete it or check timestamps before reading it.

## 4. Workflow preferences

- Change only what the task needs; unrelated findings become a new issue in this repo (English, labels), not extra changes in the PR.
- Pull requests are not built in CI: run the local MSYS2 build and the full `test_helios` before opening one (the CI build takes about 10 minutes).
- PRs follow `.github/PULL_REQUEST_TEMPLATE.md` (Problem / Changes / Testing / Notes / AI usage) and say honestly what was not tested; performance PRs carry the measured before/after numbers.
- Conventional Commits (`feat(web):`, `fix(video):`, `ci:`, `docs(github):`), one commit per logical phase. Keep temporary debug code out of commits.
- C/C++ style follows `.clang-format`.
- Releases: each merge to `develop` that changes more than Markdown/`docs/`/`.github/` (except `build.yml`)/`version.txt` publishes `vX.Y.Z-rc.N`. Stable = PR `develop` → `master`; its merge runs `stable-queue.yml` → `promote.yml`, which publishes the RC's stable artifact and opens a PR `chore: start X.Y+1.0 ...` that bumps `version.txt` on `develop`: merge it before the next merge into `develop`, or `rc-queue.yml` refuses the RC. Patch release = PR that sets `version.txt` to `X.Y.Z+1`. After any merge, follow the run it starts to the end before calling the work done.
- Linux/macOS code paths exist but are not built or tested in this fork; it is developed and tested on Windows.

## 5. Out of scope

Do not change without being asked:
- **The `HELIOS_UPDATE_REPO` CMake option** (default `eumarcodev/Helios-Server`, exposed by `/api/config` as `update_repo`); app commands get only `HELIOS_*` environment variables.
- **README credits and lineage section** (ClassicOldSong, LizardByte, Moonlight and the upstream project names): keep it as it is.
- **`third-party/` submodules**: never edit them in place; library changes go through the fork's own PR, then a submodule bump here.
- **Release workflows and `master`**: `master` only moves through the `develop` → `master` PR (the manual `promote.yml` fast-forward is rejected by the ruleset); do not release, promote or edit `.github/workflows` unless asked.
- **The user's uncommitted drafts** in this checkout (e.g. `branding/logo-drafts/`): do not commit, discard or stash them. `test_helios.log` and `write_file_test_*.txt` are outputs of `test_helios` when run from the repo root; never commit them either.
- **The installed Helios** in `C:\Program Files\Helios` and `HeliosService`: changes need elevation; restore the official exe/DLL/config after any test.
