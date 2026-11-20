/**
 * Permission bits of a paired client (`crypto::PERM` in the host). Only `perm & PERM_ALL` is ever sent back.
 * `file_upload` / `file_dwnload` exist on the host but have no toggle in the editor (legacy behaviour).
 */
export const PERMISSION_MASKS = {
  input_controller: 0x00000100,
  input_touch: 0x00000200,
  input_pen: 0x00000400,
  input_mouse: 0x00000800,
  input_kbd: 0x00001000,
  clipboard_set: 0x00010000,
  clipboard_read: 0x00020000,
  file_upload: 0x00040000,
  file_dwnload: 0x00080000,
  server_cmd: 0x00100000,
  list: 0x01000000,
  view: 0x02000000,
  launch: 0x04000000,
} as const;

export type PermissionName = keyof typeof PERMISSION_MASKS;

/** Every permission the host knows (`_all`). */
export const PERM_ALL = 0x071f1f00;

/** `launch` and above is the "dangerous" range: the badge turns red. */
export const PERM_DANGER_THRESHOLD = 0x04000000;

export type PermissionGroupId = 'action' | 'operation' | 'input';

export interface PermissionDefinition {
  name: PermissionName;
  /** Granting any of these makes this permission implicit: it shows as granted and cannot be toggled. */
  suppressedBy: readonly PermissionName[];
}

export interface PermissionGroup {
  id: PermissionGroupId;
  permissions: readonly PermissionDefinition[];
}

/** Groups of the editor, in display order. */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    id: 'action',
    permissions: [
      { name: 'list', suppressedBy: ['view', 'launch'] },
      { name: 'view', suppressedBy: ['launch'] },
      { name: 'launch', suppressedBy: [] },
    ],
  },
  {
    id: 'operation',
    permissions: [
      { name: 'clipboard_set', suppressedBy: [] },
      { name: 'clipboard_read', suppressedBy: [] },
      { name: 'server_cmd', suppressedBy: [] },
    ],
  },
  {
    id: 'input',
    permissions: [
      { name: 'input_controller', suppressedBy: [] },
      { name: 'input_touch', suppressedBy: [] },
      { name: 'input_pen', suppressedBy: [] },
      { name: 'input_mouse', suppressedBy: [] },
      { name: 'input_kbd', suppressedBy: [] },
    ],
  },
];

/** `perm` arrives as a string from some hosts (`parseInt(perm, 10)` in the legacy page); NaN becomes no permission. */
export function parsePerm(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Badge text: bytes 24, 16 and 8 of `perm` as two upper-case hex digits each, e.g. `03 00 00`. */
export function permToStr(perm: number): string {
  return [(perm >> 24) & 0xff, (perm >> 16) & 0xff, (perm >> 8) & 0xff]
    .map((segment) => segment.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

export function isDangerPerm(perm: number): boolean {
  return perm >= PERM_DANGER_THRESHOLD;
}

export function hasPermission(perm: number, name: PermissionName): boolean {
  return (perm & PERMISSION_MASKS[name]) !== 0;
}

export function isSuppressed(perm: number, definition: PermissionDefinition): boolean {
  return definition.suppressedBy.some((other) => hasPermission(perm, other));
}

/** Granted explicitly, or implied by a stronger permission. */
export function isGranted(perm: number, definition: PermissionDefinition): boolean {
  return isSuppressed(perm, definition) || hasPermission(perm, definition.name);
}

/** Flip one bit (XOR, as the legacy toggle does). */
export function togglePermission(perm: number, name: PermissionName): number {
  return perm ^ PERMISSION_MASKS[name];
}

/** What is sent to the host: unknown bits are dropped. */
export function maskPermissions(perm: number): number {
  return perm & PERM_ALL;
}
