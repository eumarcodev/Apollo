import { Button, buttonVariants, Table } from '@heroui/react';
import { GripVertical, Pencil, Play, Square, Trash2 } from 'lucide-react';
import { DropIndicator, useDragAndDrop } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import type { AppEntry } from '@/features/apps/domain/app-entry';
import type { DropPosition } from '@/features/apps/domain/app-list';
import { buildLaunchLink, type LauncherHost } from '@/features/apps/domain/launcher';

export interface AppsTableProps {
  apps: readonly AppEntry[];
  host: LauncherHost;
  currentApp: string;
  /** Every action is disabled while a request runs. */
  busy: boolean;
  onMove: (movingUuids: ReadonlySet<string>, targetUuid: string, position: DropPosition) => void;
  onEdit: (app: AppEntry) => void;
  onDelete: (app: AppEntry) => void;
  onClose: () => void;
  onLaunch: (app: AppEntry) => void;
  onExport: (app: AppEntry) => void;
}

/** The applications as a reorderable table (drag with the mouse, or with the keyboard through the grip button). */
export function AppsTable({
  apps,
  host,
  currentApp,
  busy,
  onMove,
  onEdit,
  onDelete,
  onClose,
  onLaunch,
  onExport,
}: AppsTableProps) {
  const { t } = useTranslation();
  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: busy,
    getItems: (keys) => [...keys].map((key) => ({ 'text/plain': String(key) })),
    renderDropIndicator: (target) => <DropIndicator target={target} className="helios-drop-indicator" />,
    onReorder(event) {
      if (event.target.dropPosition === 'on') {
        return;
      }
      onMove(new Set([...event.keys].map(String)), String(event.target.key), event.target.dropPosition);
    },
  });

  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content
          aria-label={t('apps.applications_title')}
          dragAndDropHooks={dragAndDropHooks}
          data-testid="apps-table"
        >
          <Table.Header>
            <Table.Column id="drag" className="w-12" />
            <Table.Column id="name" isRowHeader>
              {t('apps.name')}
            </Table.Column>
            <Table.Column id="actions" className="text-end">
              {t('apps.actions')}
            </Table.Column>
          </Table.Header>
          <Table.Body
            items={apps}
            // The rows are cached by react-aria: list every outside value a row reads so it re-renders.
            dependencies={[busy, currentApp, host, onMove, onEdit, onDelete, onClose, onLaunch, onExport, t]}
            renderEmptyState={() => (
              <p className="py-8 text-center text-muted" data-testid="apps-empty">
                {t('apps.no_apps')}
              </p>
            )}
          >
            {(app) => (
              <Table.Row id={app.uuid} data-testid={`app-row-${app.uuid}`}>
                <Table.Cell>
                  <Button slot="drag" isIconOnly variant="ghost" size="sm" isDisabled={busy}>
                    <GripVertical aria-hidden="true" className="size-4" />
                  </Button>
                </Table.Cell>
                <Table.Cell>
                  <span
                    className="font-medium"
                    data-testid={`app-name-${app.uuid}`}
                    onDoubleClick={() => onExport(app)}
                  >
                    {app.name || ' '}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      isIconOnly
                      variant="outline"
                      size="sm"
                      aria-label={t('apps.edit')}
                      data-testid={`app-edit-${app.uuid}`}
                      isDisabled={busy}
                      onPress={() => onEdit(app)}
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="danger-soft"
                      size="sm"
                      aria-label={t('apps.delete')}
                      data-testid={`app-delete-${app.uuid}`}
                      isDisabled={busy}
                      onPress={() => onDelete(app)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                    {currentApp === app.uuid ? (
                      <Button
                        isIconOnly
                        variant="secondary"
                        size="sm"
                        aria-label={t('apps.close')}
                        data-testid={`app-close-${app.uuid}`}
                        isDisabled={busy}
                        onPress={onClose}
                      >
                        <Square aria-hidden="true" className="size-4" />
                      </Button>
                    ) : (
                      // A real link on purpose: the launch link can be copied from its context menu (see the tips).
                      <a
                        href={buildLaunchLink(host, app)}
                        className={buttonVariants({ isIconOnly: true, variant: 'primary', size: 'sm' })}
                        aria-label={t('apps.launch')}
                        aria-disabled={busy || undefined}
                        data-disabled={busy || undefined}
                        data-testid={`app-launch-${app.uuid}`}
                        onClick={(event) => {
                          event.preventDefault();
                          if (!busy) {
                            onLaunch(app);
                          }
                        }}
                      >
                        <Play aria-hidden="true" className="size-4" />
                      </a>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
