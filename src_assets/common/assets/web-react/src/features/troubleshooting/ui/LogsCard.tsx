import { Button, SearchField } from '@heroui/react';
import { Copy, ScrollText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLogs } from '@/features/troubleshooting/application/use-logs';
import type { LogsPort } from '@/features/troubleshooting/application/ports';
import { filterLogLines } from '@/features/troubleshooting/domain/log-text';

export interface LogsCardProps {
  port: LogsPort;
  /** Polling interval in milliseconds (default 5 s). */
  pollIntervalMs?: number;
}

/** Live host log: polled every 5 s, filtered by a case-sensitive text, copyable. */
export function LogsCard({ port, pollIntervalMs }: LogsCardProps) {
  const { t } = useTranslation();
  const logs = useLogs(port, pollIntervalMs);
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => filterLogLines(logs ?? t('troubleshooting.logs_loading'), filter), [logs, filter, t]);

  return (
    <section id="logs" className="helios-panel flex scroll-mt-6 flex-col gap-5 rounded-2xl p-6" data-testid="card-logs">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="helios-display flex items-center gap-3 text-3xl lining-nums">
            <span aria-hidden="true" className="shrink-0" style={{ color: 'var(--helios-gold-text)' }}>
              <ScrollText className="size-7" />
            </span>
            {t('troubleshooting.logs')}
          </h2>
          <p className="text-muted">{t('troubleshooting.logs_desc')}</p>
        </div>
        <SearchField
          aria-label={t('troubleshooting.logs_find')}
          value={filter}
          onChange={setFilter}
          className="w-full sm:w-80"
          data-testid="logs-filter"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t('troubleshooting.logs_find')} data-testid="logs-filter-input" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>
      <div className="relative">
        <pre
          className="h-[26rem] overflow-auto rounded-xl border border-separator bg-background/60 p-4 pr-16 font-mono text-sm leading-relaxed"
          data-testid="logs-output"
          tabIndex={0}
        >
          {shown}
        </pre>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          className="absolute top-3 right-5"
          aria-label={t('troubleshooting.logs_copy')}
          data-testid="logs-copy"
          onPress={() => {
            void navigator.clipboard.writeText(shown);
          }}
        >
          <Copy aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </section>
  );
}
