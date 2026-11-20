import { describe, expect, it, vi } from 'vitest';
import type { HostInfo } from '@/features/pairing/domain/host-address';
import { HostCache } from './host-cache';

function store(initial: HostInfo | null) {
  return { load: vi.fn(() => initial), save: vi.fn() };
}

describe('HostCache', () => {
  it('starts empty and automatic without a stored host', () => {
    const cache = new HostCache(store(null));
    expect(cache.current).toBeNull();
    expect(cache.isManual).toBe(false);
  });

  it('starts manual with the host stored in the session', () => {
    const cache = new HostCache(store({ hostAddr: 'pc', hostPort: '1' }));
    expect(cache.current).toEqual({ hostAddr: 'pc', hostPort: '1' });
    expect(cache.isManual).toBe(true);
  });

  it('remembers resolved hosts in memory only and saves typed ones', () => {
    const backing = store(null);
    const cache = new HostCache(backing);
    cache.remember({ hostAddr: 'auto', hostPort: '2' });
    expect(cache.current).toEqual({ hostAddr: 'auto', hostPort: '2' });
    expect(cache.isManual).toBe(false);
    expect(backing.save).not.toHaveBeenCalled();
    cache.saveManual({ hostAddr: 'typed', hostPort: '3' });
    expect(cache.isManual).toBe(true);
    expect(backing.save).toHaveBeenCalledWith({ hostAddr: 'typed', hostPort: '3' });
  });

  it('forgets the memory copy on clear but stays manual', () => {
    const cache = new HostCache(store({ hostAddr: 'pc', hostPort: '1' }));
    cache.clear();
    expect(cache.current).toBeNull();
    expect(cache.isManual).toBe(true);
  });
});
