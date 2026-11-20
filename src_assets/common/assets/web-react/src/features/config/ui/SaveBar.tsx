import { Button } from '@heroui/react';
import { CircleCheck, RotateCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConfigEditor } from '@/features/config/application/use-config-editor';

/** Sticky footer of the configuration page: the save / apply notes and buttons. */
export function SaveBar({ editor }: { editor: ConfigEditor }) {
  const { t } = useTranslation();
  const { saved, restarted, saving } = editor;
  const note = restarted ? t('config.restart_note') : saved ? t('config.apply_note') : null;
  return (
    <div
      className="helios-panel sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
      data-testid="config-save-bar"
    >
      <div className="min-h-6 flex-1 basis-80" role="status" aria-live="polite">
        {note && (
          <p
            className="flex items-start gap-2 text-sm"
            data-testid={restarted ? 'config-restart-note' : 'config-apply-note'}
          >
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span>
              <b>{t('_common.success')}</b> {note}
            </span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {saved && !restarted && (
          <Button variant="secondary" onPress={() => void editor.apply()} data-testid="config-apply">
            <RotateCw aria-hidden="true" className="size-4" />
            {t('_common.apply')}
          </Button>
        )}
        <Button variant="primary" isPending={saving} onPress={() => void editor.save()} data-testid="config-save">
          <Save aria-hidden="true" className="size-4" />
          {t('_common.save')}
        </Button>
      </div>
    </div>
  );
}
