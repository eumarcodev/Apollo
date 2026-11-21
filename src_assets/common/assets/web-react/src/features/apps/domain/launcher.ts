import type { AppEntry } from './app-entry';

export interface LauncherHost {
  hostUuid: string;
  hostName: string;
}

/**
 * Deep link that opens the app in the Selene client (`art://` is the scheme the client registers). Same format as
 * the legacy page: the values are concatenated as they are, with no encoding.
 */
export function buildLaunchLink(host: LauncherHost, app: Pick<AppEntry, 'uuid' | 'name'>): string {
  return `art://launch?host_uuid=${host.hostUuid}&host_name=${host.hostName}&app_uuid=${app.uuid}&app_name=${app.name}`;
}

/** Content of the exported launcher entry (`<name>.art`); only the first line differs from the legacy file. */
export function buildLauncherFile(host: LauncherHost, app: Pick<AppEntry, 'uuid' | 'name'>): string {
  return `# Selene app entry
# Exported by Helios
# https://github.com/eumarcodev/Helios-Server

[host_uuid] ${host.hostUuid}
[host_name] ${host.hostName}
[app_uuid] ${app.uuid}
[app_name] ${app.name}
`;
}

export interface LauncherDownload {
  fileName: string;
  /** `data:` URL with the file content, as the legacy export builds it. */
  href: string;
}

export function launcherDownload(host: LauncherHost, app: Pick<AppEntry, 'uuid' | 'name'>): LauncherDownload {
  return {
    fileName: `${app.name}.art`,
    href: `data:text/plain;charset=utf-8,${encodeURIComponent(buildLauncherFile(host, app))}`,
  };
}
