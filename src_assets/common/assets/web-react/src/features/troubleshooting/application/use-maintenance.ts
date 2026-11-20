import { useCallback, useEffect, useRef, useState } from 'react';
import type { MaintenancePort } from './ports';
import { useTransient } from './use-transient';

export const RESULT_DURATION_MS = 5000;
export const RELOAD_DELAY_MS = 1000;

const reloadPage = () => window.location.reload();

export type QuitState = 'idle' | 'quitting' | 'quit';

export interface Maintenance {
  closeAppPressed: boolean;
  /** Result of the last force close, shown for 5 s. */
  closeAppStatus: boolean | null;
  closeApps(): Promise<void>;
  /** True from the click for 5 s. */
  restarting: boolean;
  restart(): Promise<void>;
  quitState: QuitState;
  /** Resolves true when the host went away (the request failed), false when it answered (exit failed). */
  quit(): Promise<boolean>;
  ddResetPressed: boolean;
  ddResetStatus: boolean | null;
  resetDisplay(): Promise<void>;
  /** Restart and quit are disabled while either one is in progress. */
  busy: boolean;
}

export interface MaintenanceOptions {
  /** Reload the page (default `window.location.reload`). */
  reload?: () => void;
}

/** State and rules of the four maintenance actions (the legacy troubleshooting page, action by action). */
export function useMaintenance(port: MaintenancePort, options: MaintenanceOptions = {}): Maintenance {
  const { reload = reloadPage } = options;

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) {
        clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);

  const [closeAppPressed, setCloseAppPressed] = useState(false);
  const [closeAppStatus, showCloseAppStatus] = useTransient<boolean>(RESULT_DURATION_MS);
  const [restarting, setRestarting] = useState(false);
  const [quitState, setQuitState] = useState<QuitState>('idle');
  const [ddResetPressed, setDdResetPressed] = useState(false);
  const [ddResetStatus, showDdResetStatus] = useTransient<boolean>(RESULT_DURATION_MS);

  const closeApps = useCallback(async () => {
    setCloseAppPressed(true);
    let status = false;
    try {
      status = await port.closeApps();
    } catch (error) {
      console.error(error);
    }
    setCloseAppPressed(false);
    showCloseAppStatus(status);
  }, [port, showCloseAppStatus]);

  const restart = useCallback(async () => {
    setRestarting(true);
    later(() => setRestarting(false), RESULT_DURATION_MS);
    let outcome: Awaited<ReturnType<MaintenancePort['restart']>> = 'rejected';
    try {
      outcome = await port.restart();
    } catch (error) {
      console.error(error);
    }
    if (outcome === 'unreachable') {
      setRestarting(false);
    }
    if (outcome !== 'accepted') {
      later(() => reload(), RELOAD_DELAY_MS);
    }
  }, [later, port, reload]);

  const quit = useCallback(async () => {
    setQuitState('quitting');
    let outcome: Awaited<ReturnType<MaintenancePort['quit']>> = 'answered';
    try {
      outcome = await port.quit();
    } catch (error) {
      console.error(error);
    }
    const exited = outcome === 'unreachable';
    setQuitState(exited ? 'quit' : 'idle');
    return exited;
  }, [port]);

  const resetDisplay = useCallback(async () => {
    setDdResetPressed(true);
    let status = false;
    try {
      status = await port.resetDisplayPersistence();
    } catch (error) {
      console.error(error);
    }
    setDdResetPressed(false);
    showDdResetStatus(status);
  }, [port, showDdResetStatus]);

  return {
    closeAppPressed,
    closeAppStatus,
    closeApps,
    restarting,
    restart,
    quitState,
    quit,
    ddResetPressed,
    ddResetStatus,
    resetDisplay,
    busy: restarting || quitState === 'quitting',
  };
}
