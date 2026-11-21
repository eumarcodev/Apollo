# Releasing

Helios publishes two kinds of builds: **release candidate (RC)** and **stable**. Releases are created by the
workflows in [`.github/workflows`](workflows); nothing is published by hand. The flow is made for a single maintainer:
no release or hotfix branches, and one click to go from a tested RC to stable.

## Flow

```
feature/* --PR (no CI build)--> develop --merge--> RC vX.Y.Z-rc.N   (rc.yml, automatic)
                                                     |
                                       test it, then merge develop into master
                                                     |
                     Queue stable release + Promote to stable --> STABLE vX.Y.Z (latest, tagged on master)
                     PR: version.txt on develop --> next minor (merge it)
```

| Channel | Source | When | Version | GitHub release |
|---|---|---|---|---|
| RC | `develop` | every merge that changes more than docs | `1.10.0-rc.3` | pre-release |
| Stable | `master` (same build as the RC) | every merge of `develop` into `master` | `1.10.0` | latest |

- `develop`: integration branch and the repository's default branch; pull requests go here.
- `master`: released code only. Merging `develop` into it (PR `develop` -> `master`) releases the stable version.
- Both are protected by the repository ruleset `master-develop`: no deletion, no force-push, and every change comes
  through a pull request (no approval needed). It has no bypass, as GitHub does not allow GitHub Actions as a bypass
  actor in a personal repository; that is why the version bump below is a pull request.
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

Merge `develop` into `master` (PR `develop` -> `master`) after the RC of `develop`'s last change is published.
**Queue stable release** (`stable-queue.yml`, a few seconds) reads `version.txt` and starts **Promote to stable**
(`promote.yml`) with that version and the merge commit; its run is titled `Stable release v1.10.0`. It stops with an
error when `master` builds differently from the latest RC of that version (only Markdown, `docs/`, `.github/` other than
`build.yml` and `version.txt` may differ), and queues nothing when nothing in the build changed since the last stable
release. To release by hand instead: **Actions > Promote to stable > Run workflow**, type the version (`1.10.0`) and
optionally an RC number (`2` for `v1.10.0-rc.2`); this fast-forwards `master` to the RC's commit, which the ruleset
now rejects (direct push to `master`), so release by merging `develop` into `master`. The workflow:

1. takes the stable build that the RC's run made, without building again (about 1 minute). Only when that artifact is
   gone (older than 90 days, or its job failed) it builds the RC's commit with the stable version, as the version is
   baked into the binaries;
2. creates the tag `vX.Y.Z` (on the merge commit of `master`, or on the RC's commit when run by hand) and publishes it
   as the latest release, with notes since the previous stable release;
3. opens a pull request `chore: start 1.11.0 after releasing v1.10.0` (branch `feature/start-1.11.0`) that bumps
   `version.txt` on `develop` to the next minor version. **Merge it before the next merge into `develop`**: until then
   `version.txt` still names the released version and `rc-queue.yml` refuses to queue an RC. Being a version-only
   change, its merge queues no RC.

### Patch release

Set `version.txt` to the patch version (e.g. `1.10.1`) in the pull request with the fix. Its merge builds
`v1.10.1-rc.1`; merge `develop` into `master` to release it. After it, `version.txt` goes to the next minor (`1.11.0`).

If `develop` already has unreleased work that must not ship in the patch, ship it all anyway, or revert it first:
there are no hotfix branches in this flow.

## Pull requests

Pull requests are not built in CI: build and test locally before opening the PR. The merge into `develop` builds the RC.

## Update notifications in Helios

Builds published from this repository check **this** repository's releases (`HELIOS_UPDATE_REPO`). The home page
follows an update channel, set in **Configuration > General > Update Channel**:

- *Stable*: only stable releases.
- *RC*: stable and release candidates.
- *Nightly*: no nightlies are published any more, so it behaves like *RC*.
- *Automatic* (default): follows the installed version, so an RC build keeps following RCs.

## Versions

`version.txt` gives `X.Y.Z`; `rc.yml` adds `-rc.N`. The RC workflow refuses a `version.txt` that is already released or lower
than the latest stable release. Old releases (`release/*`, `hotfix/*` branches and nightly tags) were made by the
previous flow and are left as they are.
