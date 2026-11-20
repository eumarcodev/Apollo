import { describe, expect, it } from 'vitest';
import {
  buildUpdatePayload,
  cleanCommands,
  createCommandRow,
  createDraft,
  isValidDisplayMode,
  type PairedClient,
} from './client';
import {
  PERMISSION_GROUPS,
  PERMISSION_MASKS,
  PERM_ALL,
  hasPermission,
  isDangerPerm,
  isGranted,
  isSuppressed,
  maskPermissions,
  parsePerm,
  permToStr,
  togglePermission,
  type PermissionDefinition,
  type PermissionName,
} from './permissions';

function definition(name: PermissionName): PermissionDefinition {
  const found = PERMISSION_GROUPS.flatMap((group) => group.permissions).find((entry) => entry.name === name);
  if (!found) {
    throw new Error(`no ${name}`);
  }
  return found;
}

describe('permission masks', () => {
  it('match the host bits', () => {
    expect(PERMISSION_MASKS).toEqual({
      input_controller: 0x100,
      input_touch: 0x200,
      input_pen: 0x400,
      input_mouse: 0x800,
      input_kbd: 0x1000,
      clipboard_set: 0x10000,
      clipboard_read: 0x20000,
      file_upload: 0x40000,
      file_dwnload: 0x80000,
      server_cmd: 0x100000,
      list: 0x1000000,
      view: 0x2000000,
      launch: 0x4000000,
    });
    const union = Object.values(PERMISSION_MASKS).reduce((all, mask) => all | mask, 0);
    expect(union).toBe(PERM_ALL);
    expect(PERM_ALL).toBe(0x071f1f00);
  });

  it('lists the editor groups in order, without the file permissions', () => {
    expect(PERMISSION_GROUPS.map((group) => [group.id, group.permissions.map((entry) => entry.name)])).toEqual([
      ['action', ['list', 'view', 'launch']],
      ['operation', ['clipboard_set', 'clipboard_read', 'server_cmd']],
      ['input', ['input_controller', 'input_touch', 'input_pen', 'input_mouse', 'input_kbd']],
    ]);
  });
});

describe('permToStr', () => {
  it('prints bytes 24, 16 and 8 as upper-case hex pairs', () => {
    expect(permToStr(0)).toBe('00 00 00');
    expect(permToStr(0x03000000)).toBe('03 00 00');
    expect(permToStr(PERM_ALL)).toBe('07 1F 1F');
    expect(permToStr(0x0000ab00)).toBe('00 00 AB');
    expect(permToStr(0x00ff0000)).toBe('00 FF 00');
  });

  it('colours the badge as danger from launch upwards', () => {
    expect(isDangerPerm(0x03000000)).toBe(false);
    expect(isDangerPerm(0x04000000)).toBe(true);
    expect(isDangerPerm(PERM_ALL)).toBe(true);
  });
});

describe('parsePerm', () => {
  it('reads numbers and numeric strings, and treats garbage as no permission', () => {
    expect(parsePerm(50331648)).toBe(50331648);
    expect(parsePerm('50331648')).toBe(50331648);
    expect(parsePerm('nope')).toBe(0);
    expect(parsePerm(undefined)).toBe(0);
  });
});

describe('toggle, check and suppression', () => {
  it('toggles every permission on and off with XOR', () => {
    for (const name of Object.keys(PERMISSION_MASKS) as PermissionName[]) {
      const on = togglePermission(0, name);
      expect(on).toBe(PERMISSION_MASKS[name]);
      expect(hasPermission(on, name)).toBe(true);
      expect(togglePermission(on, name)).toBe(0);
    }
  });

  it('leaves the other bits alone', () => {
    expect(togglePermission(0x03000000, 'input_kbd')).toBe(0x03001000);
    expect(togglePermission(0x03001000, 'view')).toBe(0x01001000);
  });

  it('suppresses list under view and launch, and view under launch', () => {
    const list = definition('list');
    const view = definition('view');
    const launch = definition('launch');
    expect(isSuppressed(0, list)).toBe(false);
    expect(isSuppressed(PERMISSION_MASKS.view, list)).toBe(true);
    expect(isSuppressed(PERMISSION_MASKS.launch, list)).toBe(true);
    expect(isSuppressed(PERMISSION_MASKS.launch, view)).toBe(true);
    expect(isSuppressed(PERMISSION_MASKS.list, view)).toBe(false);
    expect(isSuppressed(PERM_ALL, launch)).toBe(false);
  });

  it('shows a suppressed permission as granted even when its own bit is off', () => {
    const list = definition('list');
    expect(isGranted(PERMISSION_MASKS.view, list)).toBe(true);
    expect(hasPermission(PERMISSION_MASKS.view, 'list')).toBe(false);
    expect(isGranted(0, list)).toBe(false);
    expect(isGranted(PERMISSION_MASKS.list, list)).toBe(true);
  });

  it('never suppresses the permissions without a parent', () => {
    for (const group of PERMISSION_GROUPS) {
      for (const entry of group.permissions.filter((candidate) => candidate.suppressedBy.length === 0)) {
        expect(isSuppressed(PERM_ALL, entry)).toBe(false);
      }
    }
  });

  it('drops unknown bits before sending', () => {
    expect(maskPermissions(0xffffffff & 0x7fffffff)).toBe(PERM_ALL);
    expect(maskPermissions(0x00000001)).toBe(0);
  });
});

describe('display mode', () => {
  it.each(['', '   ', '1920x1080x60', '1920x1080x59.94', ' 2560x1440x144 '])('accepts %j', (value) => {
    expect(isValidDisplayMode(value)).toBe(true);
  });

  it.each(['1920x1080', '1920x1080x', '1920x1080x59.', 'axbxc', '1920*1080*60', '1920x1080x60x1'])(
    'rejects %j',
    (value) => {
      expect(isValidDisplayMode(value)).toBe(false);
    },
  );
});

const CLIENT: PairedClient = {
  uuid: 'u-1',
  name: 'Tablet',
  displayMode: '',
  perm: 0x03000000,
  connected: false,
  doCmds: [{ cmd: 'echo hi', elevated: false }],
  undoCmds: [],
  allowClientCommands: true,
  enableLegacyOrdering: true,
  alwaysUseVirtualDisplay: false,
};

describe('commands', () => {
  it('creates new rows with elevated "false" (legacy template)', () => {
    expect(createCommandRow()).toEqual({ cmd: '', elevated: 'false' });
    expect(createCommandRow()).not.toBe(createCommandRow());
  });

  it('keeps only rows with a command and trims it', () => {
    expect(
      cleanCommands([
        { cmd: '  run  ', elevated: true },
        { cmd: '   ', elevated: true },
        { cmd: '', elevated: 'false' },
        { cmd: 'two', elevated: 'false' },
      ]),
    ).toEqual([
      { cmd: 'run', elevated: true },
      { cmd: 'two', elevated: 'false' },
    ]);
  });
});

describe('draft and payload', () => {
  it('copies the client so editing never touches the list', () => {
    const draft = createDraft(CLIENT);
    draft.doCmds[0]!.cmd = 'changed';
    draft.perm = 0;
    expect(CLIENT.doCmds[0]!.cmd).toBe('echo hi');
    expect(CLIENT.perm).toBe(0x03000000);
  });

  it('builds the exact update body', () => {
    const draft = createDraft(CLIENT);
    draft.name = 'Renamed';
    draft.displayMode = ' 1920x1080x59.94 ';
    draft.perm = PERM_ALL | 0x1;
    draft.doCmds = [
      { cmd: ' a ', elevated: true },
      { cmd: ' ', elevated: false },
    ];
    draft.undoCmds = [{ cmd: 'b', elevated: 'false' }];
    draft.alwaysUseVirtualDisplay = true;
    expect(buildUpdatePayload('u-1', draft)).toEqual({
      uuid: 'u-1',
      name: 'Renamed',
      display_mode: '1920x1080x59.94',
      allow_client_commands: true,
      enable_legacy_ordering: true,
      always_use_virtual_display: true,
      perm: PERM_ALL,
      do: [{ cmd: 'a', elevated: true }],
      undo: [{ cmd: 'b', elevated: 'false' }],
    });
  });
});
