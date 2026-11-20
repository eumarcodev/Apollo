import { describe, expect, it } from 'vitest';
import { buildLaunchLink, buildLauncherFile, launcherDownload } from './launcher';

const HOST = { hostUuid: 'HOST-UUID', hostName: 'My PC' };
const APP = { uuid: 'APP-UUID', name: 'Game One' };

describe('launch link', () => {
  it('keeps the legacy art:// format, values concatenated as they are', () => {
    expect(buildLaunchLink(HOST, APP)).toBe(
      'art://launch?host_uuid=HOST-UUID&host_name=My PC&app_uuid=APP-UUID&app_name=Game One',
    );
  });
});

describe('launcher file', () => {
  it('has the legacy content except the first line (Selene instead of Artemis)', () => {
    const legacy = `# Artemis app entry
# Exported by Helios
# https://github.com/eumarcodev/Helios-Server

[host_uuid] HOST-UUID
[host_name] My PC
[app_uuid] APP-UUID
[app_name] Game One
`;
    const content = buildLauncherFile(HOST, APP);
    expect(content).toBe(legacy.replace('# Artemis app entry', '# Selene app entry'));
    expect(content.split('\n').slice(1)).toEqual(legacy.split('\n').slice(1));
    expect(content).not.toContain('\r');
  });

  it('is offered as <name>.art through a data URL', () => {
    const download = launcherDownload(HOST, APP);
    expect(download.fileName).toBe('Game One.art');
    expect(download.href).toBe(`data:text/plain;charset=utf-8,${encodeURIComponent(buildLauncherFile(HOST, APP))}`);
    expect(decodeURIComponent(download.href.split(',')[1] ?? '')).toBe(buildLauncherFile(HOST, APP));
  });
});
