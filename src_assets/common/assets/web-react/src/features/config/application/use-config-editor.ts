import { useCallback, useEffect, useRef, useState } from 'react';
import { serializeConfig, type ConfigModel, type OptionValueOf } from '@/features/config/domain/config-model';
import type { ConfigSession } from './load-config';
import type { ConfigPort, PageEnvironment } from './ports';

/** Time the restart message stays on screen (legacy `apply()`). */
export const RESTART_NOTE_MS = 5000;
/** Delay before reloading when the restart request fails at the network level. */
export const RELOAD_AFTER_NETWORK_ERROR_MS = 1000;

export type UpdateOption = <K extends string>(key: K, value: OptionValueOf<K>) => void;

export interface ConfigEditor {
  config: ConfigModel;
  update: UpdateOption;
  /** Last save answered 200 and the host was not restarted since: show the apply note and the Apply button. */
  saved: boolean;
  /** Apply succeeded: show the restart note (hidden again after 5 s). */
  restarted: boolean;
  /** A save request is in flight. */
  saving: boolean;
  save(): Promise<boolean>;
  apply(): Promise<void>;
}

/**
 * State of the configuration page after the load: the editable model and the legacy save / apply flows.
 * `session` is read once; mount the editor again (key) to start over from a new load.
 */
export function useConfigEditor(session: ConfigSession, port: ConfigPort, env: PageEnvironment): ConfigEditor {
  const [config, setConfig] = useState<ConfigModel>(session.config);
  const [saved, setSaved] = useState(false);
  const [restarted, setRestarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const configRef = useRef(config);
  const fallbackCache = useRef(session.fallbackModeCache);
  const timers = useRef(new Set<unknown>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const handle of pending) {
        env.clearTimeout(handle);
      }
      pending.clear();
    };
  }, [env]);

  const schedule = useCallback(
    (callback: () => void, ms: number) => {
      const handle = env.setTimeout(() => {
        timers.current.delete(handle);
        callback();
      }, ms);
      timers.current.add(handle);
    },
    [env],
  );

  const commit = useCallback((next: ConfigModel) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const update = useCallback<UpdateOption>(
    (key, value) => {
      commit({ ...configRef.current, [key]: value });
    },
    [commit],
  );

  const save = useCallback(async () => {
    setSaved(false);
    setRestarted(false);
    const result = serializeConfig(configRef.current, fallbackCache.current, session.tabs);
    fallbackCache.current = result.fallbackModeCache;
    if (result.config !== configRef.current) {
      commit(result.config);
    }
    setSaving(true);
    try {
      const outcome = await port.save(result.payload);
      if (outcome === 'saved') {
        setSaved(true);
        return true;
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [commit, port, session.tabs]);

  const apply = useCallback(async () => {
    setSaved(false);
    setRestarted(false);
    if (!(await save())) {
      return;
    }
    setRestarted(true);
    schedule(() => {
      setSaved(false);
      setRestarted(false);
    }, RESTART_NOTE_MS);
    const outcome = await port.restart();
    if (outcome === 'rejected') {
      env.reload();
    } else if (outcome === 'unreachable') {
      schedule(() => env.reload(), RELOAD_AFTER_NETWORK_ERROR_MS);
    }
  }, [env, port, save, schedule]);

  return { config, update, saved, restarted, saving, save, apply };
}
