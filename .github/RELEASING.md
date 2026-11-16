# Releasing

This fork publishes three kinds of builds: **nightly**, **release candidate (RC)** and **stable**. Releases are
created by the workflows in [`.github/workflows`](workflows); nothing is published by hand.

## Channels

| Channel | Source | When | Version | GitHub release |
|---|---|---|---|---|
| Nightly | `develop` | every day at 03:00 (Brasilia), only if `develop` has new commits | `1.4.0-nightly.20261116` | pre-release, last 7 kept |
| RC | `release/X.Y` or `hotfix/X.Y.Z` | every push to the branch | `1.3.0-rc.2` | pre-release |
| Stable | tag `vX.Y.Z` on `master` | when you push the tag | `1.3.0` | latest |

The nightly version is one minor above the highest stable/rc version already tagged, so a nightly is always newer than
the release candidate in progress. With the same `X.Y.Z`, the order is `nightly < rc < stable`.

## Branches

```
feature/* --PR--> develop --daily--> NIGHTLY
                     |
                     +-- cut-release --> release/1.4 --push--> RC 1.4.0-rc.1, rc.2, ...
                                              |
                                              +-- PR --> master -- tag v1.4.0 --> STABLE 1.4.0
                                                                         |
                                                                         +-- PR --> develop (automatic)

master --- cut-release (hotfix) --> hotfix/1.4.1 --push--> RC 1.4.1-rc.1 --PR--> master -- tag v1.4.1 --> STABLE
```

- `develop`: integration branch, pull requests go here.
- `release/X.Y`: cut from `develop` when the release is feature complete. Only fixes go in.
- `hotfix/X.Y.Z`: cut from `master`, only for the **latest** stable line.
- `master`: only receives finished releases. It always contains what was published as stable.

## One-time setup

1. Create `develop` from `master` and keep `master` as the default branch (scheduled workflows run from it):
   `git push origin master:refs/heads/develop`
2. In **Settings > Actions > General**, enable **Allow GitHub Actions to create and approve pull requests**. Without
   it the stable workflow cannot open the PRs that bring `master` back into `develop`.
3. Optional: protect `master` and `release/**` (require a pull request).

## How to

### Nightly

Nothing to do. To build one now: **Actions > Nightly > Run workflow** (tick *force* to rebuild even without new
commits or to replace today's nightly).

### Cut a release candidate

**Actions > Cut release or hotfix > Run workflow**, kind `release`. The version defaults to one minor above the latest
stable (or type `X.Y`). It creates `release/X.Y` from `develop` and starts `vX.Y.0-rc.1`. Every further push to that
branch (bug fixes) publishes the next RC.

### Publish the stable release

1. Open a pull request from `release/X.Y` to `master` and merge it.
2. Tag the merge commit:
   ```bash
   git checkout master && git pull
   git tag v1.4.0
   git push origin v1.4.0
   ```
3. `stable.yml` checks that the tag is on `master`, builds, publishes the release as *latest*, and opens PRs from
   `master` to `develop`. Merge them so `develop` sees the new tag.

### Hotfix

1. **Cut release or hotfix**, kind `hotfix`. The version defaults to the next patch of the latest stable
   (`1.4.1`). It creates `hotfix/1.4.1` from `master` and starts `v1.4.1-rc.1`.
2. Push the fix to that branch. Each push publishes a new RC to test.
3. Open a PR from `hotfix/1.4.1` to `master`, merge it, and tag `v1.4.1` as above.

Hotfixes only target the latest stable line. Fixing an older line needs its own support branch, which is not covered.

## Pull requests

`pr.yml` only runs the Windows build when the PR changes code that affects the binaries (`src/`, `src_assets/`,
`cmake/`, `third-party/`, `packaging/`, `scripts/`, `tests/`, build files or the workflows). Draft PRs are skipped. Add the
`build` label to force it.

## Update notifications in Helios

Builds published from this repository check **this** repository's releases (`APOLLO_UPDATE_REPO`). The home page
follows an update channel, set in **Configuration > General > Update Channel**:

- *Stable*: only stable releases.
- *RC*: stable and release candidates.
- *Nightly*: stable, release candidates and nightlies.
- *Automatic* (default): follows the installed version, so a nightly or RC build keeps following its own channel.

## Versions

Versions are derived from branch and tag names, not from commit messages: `release/1.4` gives `1.4.0`, `hotfix/1.4.1`
gives `1.4.1`, and a stable tag `v1.4.0` gives `1.4.0`. The version is baked into the binaries, so each channel
is compiled separately and a release candidate is never promoted by copying files.
