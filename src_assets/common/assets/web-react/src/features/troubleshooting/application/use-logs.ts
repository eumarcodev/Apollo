import { useQuery } from '@tanstack/react-query';
import type { LogsPort } from './ports';

export const LOG_POLL_INTERVAL_MS = 5000;

/**
 * The host log, read once on load and then every 5 s while the page is mounted. A failed read keeps the text
 * already shown; `null` until the first read succeeds.
 */
export function useLogs(port: LogsPort, intervalMs: number = LOG_POLL_INTERVAL_MS): string | null {
  const query = useQuery({
    queryKey: ['troubleshooting', 'logs'],
    queryFn: ({ signal }) => port.readLogs(signal),
    refetchInterval: intervalMs,
    refetchIntervalInBackground: true,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  return query.data ?? null;
}
