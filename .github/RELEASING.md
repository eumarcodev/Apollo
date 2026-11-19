# Releasing

Helios publishes two kinds of builds: **release candidate (RC)** and **stable**. Releases are created by the
workflows in [`.github/workflows`](workflows); nothing is published by hand. The flow is made for a single maintainer:
no release or hotfix branches, and one click to go from a tested RC to stable.

## Flow

```
feature/* --PR (no CI build)--> develop --merge--> RC vX.Y.Z-rc.N   (rc.yml, automatic)
                                                     |
                                       test it, then Actions > Promote to stable
                                                     |
                     master fast-forwards to that commit --> STABLE vX.Y.Z (latest)
                     version.txt on develop --> next minor
```

| Channel | Source | When | Version | GitHub release |
|---|---|---|---|---|
| RC | `develop` | every merge that changes more than docs | `1.10.0-rc.3` | pre-release |
| Stable | the promoted RC's commit | when you run **Promote to stable** | `1.10.0` | latest |

- `develop`: integration branch; pull requests go here.
- `master`: only moves forward to released commits (fast-forward, no merge commits, no PRs back to `develop`).
- `version.txt` (repository root, on `develop`): the version the next stable release will have. RCs are numbered after it.
  It is not called `VERSION` because on Windows that name collides with the C++ standard header `<version>`.

## How to

### Release candidate

Merge a pull request into `develop`. **Queue release candidate** (`rc-queue.yml`, a few seconds) works out the next
`vX.Y.Z-rc.N` and starts **Release candidate** (`rc.yml`), whose run is titled `Release candidate vX.Y.Z-rc.N`. It
builds and publishes that RC and, in parallel, builds the same commit as the stable `vX.Y.Z` and keeps it as an
artifact of the run (`helios-windows-x64-stable`, 90 days), for the promotion. A newer merge cancels an RC that is
still building. Merges that only change Markdown, `docs/`, `.github/` (except `build.yml`) or `version.txt` do not
queue an RC. To queue one anyway: **Actions > Queue release candidate > Run workflow** on `develop`.

### Stable

**Actions > Promote to stable > Run workflow**. Type the version to release (`1.10.0`, the one in `version.txt`) and
leave the RC field empty to promote its latest RC, or type an RC number (`2` for `v1.10.0-rc.2`). The run is titled
`Stable release v1.10.0`. The workflow:

1. takes the stable build that the RC's run made, without building again (about 1 minute). Only when that artifact is
   gone (older than 90 days, or its job failed) it builds the RC's commit with the stable version, as the version is
   baked into the binaries;
2. fast-forwards `master` to that commit and publishes `vX.Y.Z` as the latest release, with notes since the previous
   stable release;
3. bumps `version.txt` on `develop` to the next minor version (`1.10.0` -> `1.11.0`).

### Patch release

Set `version.txt` to the patch version (e.g. `1.10.1`) in the pull request with the fix. Its merge builds
`v1.10.1-rc.1`; promote it as usual. After it, `version.txt` goes to the next minor (`1.11.0`).

If `develop` already has unreleased work that must not ship in the patch, ship it all anyway, or revert it first:
there are no hotfix branches in this flow.

## Pull requests

Pull requests are not built in CI: build and test locally before opening the PR. The merge into `develop` builds the RC.

## Update notifications in Helios

Builds published from this repository check **this** repository's releases (`APOLLO_UPDATE_REPO`). The home page
follows an update channel, set in **Configuration > General > Update Channel**:

- *Stable*: only stable releases.
- *RC*: stable and release candidates.
- *Nightly*: no nightlies are published any more, so it behaves like *RC*.
- *Automatic* (default): follows the installed version, so an RC build keeps following RCs.

## Versions

`version.txt` gives `X.Y.Z`; `rc.yml` adds `-rc.N`. The RC workflow refuses a `version.txt` that is already released or lower
than the latest stable release. Old releases (`release/*`, `hotfix/*` branches and nightly tags) were made by the
previous flow and are left as they are.
