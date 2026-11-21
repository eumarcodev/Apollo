export interface LogEntry {
  timestamp: string;
  /** Text before the first ":" of the message (Fatal, Error, Warning, Info...). */
  level: string;
  /** The message, as the host wrote it. */
  value: string;
}

/**
 * Split the host log into entries. An entry starts with `[YYYY-MM-DD HH:MM:SS.mmm]: `; everything up to the next
 * timestamp belongs to it (same rule as the legacy home page).
 */
export function parseLogEntries(logs: string | null | undefined): LogEntry[] {
  if (!logs) {
    return [];
  }
  const regex = /(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}]):\s/g;
  const raw = logs.split(regex).slice(1);
  const entries: LogEntry[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const value = raw[i + 1] ?? '';
    entries.push({ timestamp: raw[i] ?? '', level: value.split(':')[0] ?? '', value });
  }
  return entries;
}

export function fatalEntries(entries: readonly LogEntry[]): LogEntry[] {
  return entries.filter((entry) => entry.level === 'Fatal');
}
