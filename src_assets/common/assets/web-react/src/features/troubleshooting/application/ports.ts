/** How the host answered `POST ./api/restart`. */
export type RestartOutcome = 'accepted' | 'rejected' | 'unreachable';

/** How `POST ./api/quit` ended: an answer means the host is still alive, no answer means it exited. */
export type QuitOutcome = 'answered' | 'unreachable';

/** The maintenance actions of the host. */
export interface MaintenancePort {
  /** `POST ./api/apps/close`: the `status` of the answer. */
  closeApps(): Promise<boolean>;
  restart(): Promise<RestartOutcome>;
  quit(): Promise<QuitOutcome>;
  /** `POST ./api/reset-display-device-persistence`: the `status` of the answer (Windows only). */
  resetDisplayPersistence(): Promise<boolean>;
}

/** The host log (`GET ./api/logs`), already decoded with the charset the host declares. */
export interface LogsPort {
  readLogs(signal?: AbortSignal): Promise<string>;
}
