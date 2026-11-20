/**
 * Configuration slice (`/config`, issue #167): load, defaults, platform tabs, hash navigation, save and apply.
 *
 * How the tab issues (#168-#174) plug in, without touching anything else of this slice:
 *
 * 1. Registry (domain): `CONFIG_TABS` in `domain/config-tabs.ts` holds every tab id, its i18n name key and the
 *    verbatim legacy defaults of its options. Do not change the defaults: they decide what is filled on load and what
 *    is stripped on save, and a snapshot test (plus a comparison with the legacy `web/config.html`) guards them.
 * 2. Component: write `ui/tabs/<Name>Tab.tsx` as a `ComponentType<ConfigTabProps>` and register it in
 *    `ui/tabs/registry.ts` (`TAB_COMPONENTS`, one line: `general: GeneralTab,`). Tabs without an entry render
 *    `ConfigTabPlaceholder`. The page already renders the tab title, the panel card and the save bar.
 * 3. Contract `ConfigTabProps` (`ui/tabs/types.ts`): `{ config, platform, update(key, value), vdisplayStatus }`.
 *    - read values from `config[key]` (strings from the server, or the default of the tab when the option is missing);
 *    - the General tab edits the three command lists `config.global_prep_cmd`, `config.global_state_cmd` and
 *      `config.server_cmd` (typed rows; `elevated` is a boolean on Windows) through `update('global_prep_cmd', rows)`;
 *      Audio/Video uses `vdisplayStatus` and `config.dd_mode_remapping`;
 *    - change a value only with `update(key, value)`; keep the value representation (use the boolean codec of
 *      `@/shared/kernel` / `BooleanField` of `@/shared/ui`), so an untouched option still equals its default on save;
 *    - every field has `id={optionKey}`: `#<optionKey>` in the URL selects the tab and scrolls to the field.
 * 4. Saving is done by the page (`POST ./api/config` with the defaults stripped); a tab never calls the API for the
 *    config itself. Platform-specific fields decide on `platform`, never on hardware.
 */
import { createElement } from 'react';
import { browserEnvironment, createConfigApi } from './infrastructure/config-api';
import { ConfigPage as ConfigPageView } from './ui/ConfigPage';

const api = createConfigApi();

/** Configuration page wired to the real API and the browser. */
export function ConfigPage() {
  return createElement(ConfigPageView, { port: api, env: browserEnvironment });
}

export { CONFIG_TAB_IDS, CONFIG_TABS, resolveHash, visibleTabs } from './domain/config-tabs';
export type { ConfigTab, ConfigTabId, HashTarget, OptionValue } from './domain/config-tabs';
export type {
  ConfigModel,
  DisplayModeRemapping,
  OptionValueOf,
  PrepCommand,
  ServerCommand,
  SpecialOptions,
  VdisplayStatus,
} from './domain/config-model';
export type { UpdateOption } from './application/use-config-editor';
export type { ConfigTabProps } from './ui/tabs/types';
