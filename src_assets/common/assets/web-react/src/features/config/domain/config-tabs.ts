import type { Platform } from '@/shared/kernel';

/**
 * Tab registry of the configuration page, copied from the `tabs` array of the legacy `web/config.html`.
 *
 * Ids, order and default values are verbatim (do not "fix" types: `min_log_level` is a number here while the server
 * answers strings, exactly as on the legacy page). Each tab issue renders the fields of its options; the defaults are
 * used to fill missing options on load and to strip unchanged options on save.
 */
export const CONFIG_TAB_IDS = [
  'general',
  'input',
  'av',
  'network',
  'files',
  'advanced',
  'nv',
  'qsv',
  'amd',
  'pyrowave',
  'vt',
  'vaapi',
  'sw',
] as const;

export type ConfigTabId = (typeof CONFIG_TAB_IDS)[number];

/** JSON value of an option (what `JSON.stringify` compares when the defaults are stripped). */
export type OptionValue = string | number | boolean | null | OptionValue[] | { [key: string]: OptionValue };

export interface ConfigTab {
  id: ConfigTabId;
  /** i18n key of the tab name. */
  nameKey: string;
  /** Default value of every option the tab owns, in the legacy order. */
  options: Readonly<Record<string, OptionValue>>;
}

export const CONFIG_TABS: readonly ConfigTab[] = [
  {
    id: 'general',
    nameKey: 'config.tab_general',
    options: {
      locale: 'en',
      sunshine_name: '',
      min_log_level: 2,
      global_prep_cmd: [],
      global_state_cmd: [],
      server_cmd: [],
      notify_pre_releases: 'disabled',
      update_channel: '',
      system_tray: 'enabled',
      hide_tray_controls: 'disabled',
      enable_pairing: 'enabled',
      enable_discovery: 'enabled',
    },
  },
  {
    id: 'input',
    nameKey: 'config.tab_input',
    options: {
      controller: 'enabled',
      gamepad: 'auto',
      ds4_back_as_touchpad_click: 'enabled',
      motion_as_ds4: 'enabled',
      touchpad_as_ds4: 'enabled',
      ds5_inputtino_randomize_mac: 'enabled',
      back_button_timeout: -1,
      keyboard: 'enabled',
      key_repeat_delay: 500,
      key_repeat_frequency: 24.9,
      always_send_scancodes: 'enabled',
      key_rightalt_to_key_win: 'disabled',
      mouse: 'enabled',
      high_resolution_scrolling: 'enabled',
      native_pen_touch: 'enabled',
      enable_input_only_mode: 'disabled',
      forward_rumble: 'enabled',
      keybindings: '[0x10,0xA0,0x11,0xA2,0x12,0xA4]',
    },
  },
  {
    id: 'av',
    nameKey: 'config.tab_av',
    options: {
      audio_sink: '',
      virtual_sink: '',
      stream_audio: 'enabled',
      install_steam_audio_drivers: 'enabled',
      keep_sink_default: 'enabled',
      auto_capture_sink: 'enabled',
      adapter_name: '',
      output_name: '',
      isolated_virtual_display_option: 'disabled',
      fallback_mode: '',
      dd_configuration_option: 'disabled',
      dd_resolution_option: 'auto',
      dd_manual_resolution: '',
      dd_refresh_rate_option: 'auto',
      dd_manual_refresh_rate: '',
      dd_hdr_option: 'auto',
      dd_wa_hdr_toggle_delay: 0,
      dd_config_revert_delay: 3000,
      dd_config_revert_on_disconnect: 'disabled',
      dd_mode_remapping: { mixed: [], resolution_only: [], refresh_rate_only: [] },
      dd_wa_hdr_toggle: 'disabled',
      headless_mode: 'disabled',
      double_refreshrate: 'disabled',
      max_bitrate: 0,
      minimum_fps_target: 0,
    },
  },
  {
    id: 'network',
    nameKey: 'config.tab_network',
    options: {
      upnp: 'disabled',
      address_family: 'ipv4',
      port: 47989,
      origin_web_ui_allowed: 'lan',
      external_ip: '',
      lan_encryption_mode: 0,
      wan_encryption_mode: 1,
      ping_timeout: 10000,
      audio_qos: 'video',
    },
  },
  {
    id: 'files',
    nameKey: 'config.tab_files',
    options: {
      file_apps: '',
      credentials_file: '',
      log_path: '',
      pkey: '',
      cert: '',
      file_state: '',
    },
  },
  {
    id: 'advanced',
    nameKey: 'config.tab_advanced',
    options: {
      fec_percentage: 20,
      qp: 28,
      min_threads: 2,
      limit_framerate: 'enabled',
      envvar_compatibility_mode: 'disabled',
      legacy_ordering: 'disabled',
      ignore_encoder_probe_failure: 'disabled',
      hevc_mode: 0,
      av1_mode: 0,
      capture: '',
      encoder: '',
    },
  },
  {
    id: 'nv',
    nameKey: 'config.tab_nv',
    options: {
      nvenc_preset: 1,
      nvenc_twopass: 'quarter_res',
      nvenc_spatial_aq: 'disabled',
      nvenc_vbv_increase: 0,
      nvenc_realtime_hags: 'enabled',
      nvenc_latency_over_power: 'enabled',
      nvenc_opengl_vulkan_on_dxgi: 'enabled',
      nvenc_h264_cavlc: 'disabled',
      nvenc_intra_refresh: 'disabled',
    },
  },
  {
    id: 'qsv',
    nameKey: 'config.tab_qsv',
    options: {
      qsv_preset: 'medium',
      qsv_coder: 'auto',
      qsv_slow_hevc: 'disabled',
    },
  },
  {
    id: 'amd',
    nameKey: 'config.tab_amd',
    options: {
      amd_usage: 'ultralowlatency',
      amd_rc: 'vbr_latency',
      amd_enforce_hrd: 'disabled',
      amd_quality: 'balanced',
      amd_preanalysis: 'disabled',
      amd_vbaq: 'enabled',
      amd_coder: 'auto',
    },
  },
  {
    id: 'pyrowave',
    nameKey: 'config.tab_pyrowave',
    options: {
      pyrowave: 'enabled',
      pyrowave_packet_size: 1200,
      pyrowave_min_frame_kb: 16,
      pyrowave_static_boost: 'enabled',
      pyrowave_priority: 'medium',
      pyrowave_simulated_loss: 0,
    },
  },
  {
    id: 'vt',
    nameKey: 'config.tab_vt',
    options: {
      vt_coder: 'auto',
      vt_software: 'auto',
      vt_realtime: 'enabled',
    },
  },
  {
    id: 'vaapi',
    nameKey: 'config.tab_vaapi',
    options: {
      vaapi_strict_rc_buffer: 'disabled',
    },
  },
  {
    id: 'sw',
    nameKey: 'config.tab_sw',
    options: {
      sw_preset: 'superfast',
      sw_tune: 'zerolatency',
    },
  },
];

/** Tabs hidden per platform (legacy `created()` filter). */
const HIDDEN_TABS: Readonly<Record<Platform, readonly ConfigTabId[]>> = {
  windows: ['vt', 'vaapi'],
  linux: ['amd', 'qsv', 'vt', 'pyrowave'],
  macos: ['amd', 'nv', 'qsv', 'vaapi', 'pyrowave'],
};

/** The tabs shown on a host platform, in registry order. */
export function visibleTabs(platform: Platform, tabs: readonly ConfigTab[] = CONFIG_TABS): ConfigTab[] {
  const hidden = HIDDEN_TABS[platform];
  return tabs.filter((tab) => !hidden.includes(tab.id));
}

export interface HashTarget {
  tabId: ConfigTabId;
  /** Set when the hash names an option: the DOM id of the field to scroll to. */
  optionKey: string | null;
}

/**
 * Resolve `#<tabId>` or `#<optionKey>` against the shown tabs (legacy `handleHash`: the last match wins).
 * Returns null for an empty hash or one that names nothing on these tabs.
 */
export function resolveHash(hash: string, tabs: readonly ConfigTab[]): HashTarget | null {
  const stripped = hash.startsWith('#') ? hash.substring(1) : hash;
  if (!stripped) {
    return null;
  }
  let target: HashTarget | null = null;
  for (const tab of tabs) {
    if (tab.id === stripped) {
      target = { tabId: tab.id, optionKey: null };
    }
    if (Object.prototype.hasOwnProperty.call(tab.options, stripped)) {
      target = { tabId: tab.id, optionKey: stripped };
    }
  }
  return target;
}
