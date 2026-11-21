/** A save that did not succeed; `error` is the message of the server when it sent one. */
export interface SaveFailure {
  status: 'failed';
  error?: string;
}

/** Result of `POST ./api/config`. */
export type SaveOutcome = 'saved' | SaveFailure;

/**
 * Result of `POST ./api/restart`: `ok` (200), `rejected` (any other status, the page reloads) or `unreachable` (network
 * error, usual while the host restarts: the page reloads after 1 s).
 */
export type RestartOutcome = 'ok' | 'rejected' | 'unreachable';

/** The host configuration endpoints. */
export interface ConfigPort {
  /** Raw `GET ./api/config` body (metadata plus every option of the config file). */
  load(signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>>;
  save(payload: Readonly<Record<string, unknown>>): Promise<SaveOutcome>;
  restart(): Promise<RestartOutcome>;
}

/** Browser effects of the apply flow, injectable for tests. */
export interface PageEnvironment {
  reload(): void;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
