import { createBooleanCodec, type BooleanLike } from '@/shared/kernel';
import { maskPermissions } from './permissions';

/** One connect (`do`) or disconnect (`undo`) command; `elevated` keeps the spelling the host sent. */
export type ClientCommand = { cmd: string; elevated: BooleanLike };

export interface PairedClient {
  uuid: string;
  name: string;
  displayMode: string;
  perm: number;
  connected: boolean;
  doCmds: readonly ClientCommand[];
  undoCmds: readonly ClientCommand[];
  allowClientCommands: BooleanLike;
  enableLegacyOrdering: BooleanLike;
  alwaysUseVirtualDisplay: BooleanLike;
}

/** Editable copy of a client while its editor is open; discarding it is the whole "cancel". */
export interface ClientDraft {
  name: string;
  perm: number;
  displayMode: string;
  allowClientCommands: BooleanLike;
  enableLegacyOrdering: BooleanLike;
  alwaysUseVirtualDisplay: BooleanLike;
  doCmds: ClientCommand[];
  undoCmds: ClientCommand[];
}

/** Body of `POST ./api/clients/update`. */
export interface UpdateClientPayload {
  uuid: string;
  name: string;
  display_mode: string;
  allow_client_commands: BooleanLike;
  enable_legacy_ordering: BooleanLike;
  always_use_virtual_display: BooleanLike;
  perm: number;
  do: ClientCommand[];
  undo: ClientCommand[];
}

/** New command row (legacy `cmdTpl`). */
export function createCommandRow(): ClientCommand {
  return { cmd: '', elevated: 'false' };
}

/** The command lists are only edited while the device may run client commands. */
export function isCommandsEnabled(draft: Pick<ClientDraft, 'allowClientCommands'>): boolean {
  return createBooleanCodec(draft.allowClientCommands).isOn(draft.allowClientCommands);
}

const DISPLAY_MODE_PATTERN = /^\d+x\d+x\d+(\.\d+)?$/;

/** Empty (automatic matching) or `<width>x<height>x<fps>` with an optional fractional rate. */
export function isValidDisplayMode(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || DISPLAY_MODE_PATTERN.test(trimmed);
}

export function createDraft(client: PairedClient): ClientDraft {
  return {
    name: client.name,
    perm: client.perm,
    displayMode: client.displayMode,
    allowClientCommands: client.allowClientCommands,
    enableLegacyOrdering: client.enableLegacyOrdering,
    alwaysUseVirtualDisplay: client.alwaysUseVirtualDisplay,
    doCmds: client.doCmds.map((command) => ({ ...command })),
    undoCmds: client.undoCmds.map((command) => ({ ...command })),
  };
}

/** Rows with an empty command are dropped; the others are sent with the command trimmed. */
export function cleanCommands(commands: readonly ClientCommand[]): ClientCommand[] {
  const cleaned: ClientCommand[] = [];
  for (const { cmd, elevated } of commands) {
    const trimmed = cmd.trim();
    if (trimmed) {
      cleaned.push({ cmd: trimmed, elevated });
    }
  }
  return cleaned;
}

export function buildUpdatePayload(uuid: string, draft: ClientDraft): UpdateClientPayload {
  return {
    uuid,
    name: draft.name,
    display_mode: draft.displayMode.trim(),
    allow_client_commands: draft.allowClientCommands,
    enable_legacy_ordering: draft.enableLegacyOrdering,
    always_use_virtual_display: draft.alwaysUseVirtualDisplay,
    perm: maskPermissions(draft.perm),
    do: cleanCommands(draft.doCmds),
    undo: cleanCommands(draft.undoCmds),
  };
}
