import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useServerConfig } from '@/shared/infrastructure/server-config';
import {
  HeliosVersion,
  pickLatestRelease,
  resolveUpdateChannel,
  type UpdateChannel,
} from '@/features/dashboard/domain/helios-version';
import { describeVersion, type VersionStatus } from '@/features/dashboard/domain/version-status';
import { DEFAULT_UPDATE_REPO, type ReleasesPort } from './ports';

export interface VersionState {
  /** The installed version; null while loading, when the config failed or the host reports no version. */
  installed: HeliosVersion | null;
  updateChannel: UpdateChannel;
  /** True until the config and the release check have both finished (they fail softly, as on the legacy page). */
  loading: boolean;
  status: VersionStatus | null;
}

function toInstalled(version: string | undefined): HeliosVersion | null {
  return version ? new HeliosVersion(version) : null;
}

/** Installed version, update channel and the newest release that channel may be notified about. */
export function useVersionStatus(releases: ReleasesPort): VersionState {
  const config = useServerConfig();
  const installed = useMemo(() => toInstalled(config.data?.version), [config.data?.version]);
  const updateChannel = resolveUpdateChannel(
    config.data?.options['update_channel'],
    config.data?.options['notify_pre_releases'],
    installed,
  );
  const repo = config.data?.updateRepo ?? DEFAULT_UPDATE_REPO;

  const latest = useQuery({
    queryKey: ['dashboard', 'latest-release', repo, updateChannel],
    enabled: installed !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return pickLatestRelease(await releases.listReleases(repo, signal), updateChannel);
      } catch (error) {
        // The update check is a courtesy: the page still renders without it.
        console.error(error);
        return null;
      }
    },
  });

  const loading = config.isPending || (installed !== null && latest.isPending);
  const status = installed ? describeVersion(installed, latest.data ?? null, loading) : null;
  return { installed, updateChannel, loading, status };
}
