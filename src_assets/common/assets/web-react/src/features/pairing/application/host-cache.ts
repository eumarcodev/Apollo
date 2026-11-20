import type { HostInfo } from '@/features/pairing/domain/host-address';
import type { HostInfoStore } from './ports';

/**
 * Host of the deep link for the lifetime of the page, as on the legacy page: loaded from the session store, kept in
 * memory after each OTP, and "manual" once the user saved one by hand (then it wins over the address the host reports).
 * A tab switch clears the memory copy but not the manual flag.
 */
export class HostCache {
  private cached: HostInfo | null;
  private manual: boolean;
  private readonly store: HostInfoStore;

  constructor(store: HostInfoStore) {
    this.store = store;
    this.cached = store.load();
    this.manual = this.cached !== null;
  }

  get current(): HostInfo | null {
    return this.cached;
  }

  get isManual(): boolean {
    return this.manual;
  }

  /** Keep the host resolved for an OTP (memory only). */
  remember(info: HostInfo): void {
    this.cached = { ...info };
  }

  /** Keep a host typed by hand, also for the rest of the browser session. */
  saveManual(info: HostInfo): void {
    this.cached = { ...info };
    this.manual = true;
    this.store.save(this.cached);
  }

  clear(): void {
    this.cached = null;
  }
}
