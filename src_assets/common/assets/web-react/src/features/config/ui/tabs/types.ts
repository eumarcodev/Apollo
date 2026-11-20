import type { Platform } from '@/shared/kernel';
import type { UpdateOption } from '@/features/config/application/use-config-editor';
import type { ConfigModel, VdisplayStatus } from '@/features/config/domain/config-model';

/**
 * Contract of every configuration tab component (`{ config, platform, update(key, value) }` plus the extras).
 *
 * - `config`: the whole model, read-only. Options of the config file arrive as the server sent them (strings);
 *   missing options hold the tab default (`CONFIG_TABS`); the special options are structured
 *   (`global_prep_cmd`, `global_state_cmd` and `server_cmd` are the three command lists of the General tab,
 *   `dd_mode_remapping` belongs to Audio/Video).
 * - `update(key, value)`: replaces one option. Never mutate `config`.
 * - Every field keeps its option key as DOM `id` (`id="qp"`), so `#qp` in the URL opens the tab and scrolls to it.
 */
export interface ConfigTabProps {
  config: ConfigModel;
  platform: Platform;
  update: UpdateOption;
  /** Virtual display driver status from `GET /api/config` (Windows only); used by the Audio/Video tab. */
  vdisplayStatus: VdisplayStatus;
}
