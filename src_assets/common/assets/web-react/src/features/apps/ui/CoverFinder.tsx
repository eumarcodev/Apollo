import { Alert, Button, Modal, Spinner } from '@heroui/react';
import { ImageDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CoversPort } from '@/features/apps/application/ports';
import { useCoverFinder } from '@/features/apps/application/use-cover-finder';

export interface CoverFinderProps {
  port: CoversPort;
  /** Name typed in the editor; the search runs when the popup opens. */
  name: string;
  /** Receives the path the host stored the picked cover at. */
  onPath: (path: string) => void;
}

/** "Find cover (online)" button and the popup with the covers found for the app name. */
export function CoverFinder({ port, name, onPath }: CoverFinderProps) {
  const { t } = useTranslation();
  const finder = useCoverFinder(port, onPath);

  return (
    <>
      <Button variant="secondary" data-testid="cover-finder-open" onPress={() => finder.open(name.trim())}>
        <ImageDown aria-hidden="true" className="size-4" />
        {t('apps.find_cover_online')}
      </Button>
      <Modal.Backdrop
        isOpen={finder.isOpen}
        onOpenChange={(open) => {
          if (!open && !finder.busy) {
            finder.close();
          }
        }}
      >
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog data-testid="cover-finder-dialog">
            <Modal.CloseTrigger aria-label={t('apps.covers_close')} data-testid="cover-finder-close" />
            <Modal.Header>
              <Modal.Heading>{t('apps.covers_found')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4" aria-busy={finder.status === 'searching' || finder.busy}>
                {finder.status === 'searching' && (
                  <div className="flex items-center gap-3 py-6" data-testid="cover-finder-loading" role="status">
                    <Spinner size="sm" />
                    <span>{t('apps.loading')}</span>
                  </div>
                )}
                {finder.status === 'error' && (
                  <Alert status="danger" data-testid="cover-finder-error">
                    <Alert.Content>
                      <Alert.Description>{t('apps.covers_error')}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                {finder.pickError !== null && (
                  <Alert status="danger" data-testid="cover-finder-pick-error">
                    <Alert.Content>
                      <Alert.Description>{t('apps.covers_pick_error', { reason: finder.pickError })}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                {finder.status === 'ready' && finder.candidates.length === 0 && (
                  <p className="py-6 text-center text-muted" data-testid="cover-finder-empty">
                    {t('apps.covers_none')}
                  </p>
                )}
                {finder.candidates.length > 0 && (
                  <ul
                    className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${finder.busy ? 'pointer-events-none opacity-60' : ''}`}
                    data-testid="cover-finder-results"
                  >
                    {finder.candidates.map((cover) => (
                      <li key={cover.key}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-center gap-2 rounded-xl p-2 text-center transition hover:bg-surface-secondary focus-visible:outline-2"
                          disabled={finder.busy}
                          data-testid={`cover-${cover.key}`}
                          onClick={() => void finder.pick(cover)}
                        >
                          <img
                            src={cover.url}
                            alt=""
                            loading="lazy"
                            className="aspect-[3/4] w-full rounded-lg object-cover"
                          />
                          <span className="text-sm">{cover.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
