import { useQuery } from '@tanstack/react-query';
import { fatalEntries, parseLogEntries, type LogEntry } from '@/features/dashboard/domain/startup-log';
import type { HostLogPort } from './ports';

/** Fatal entries of the host log; an unreadable log counts as "no errors" (logged to the console). */
export function useStartupErrors(log: HostLogPort): LogEntry[] {
  const query = useQuery({
    queryKey: ['dashboard', 'startup-errors'],
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return fatalEntries(parseLogEntries(await log.readLog(signal)));
      } catch (error) {
        console.error(error);
        return [];
      }
    },
  });
  return query.data ?? [];
}
