import { Button, Chip } from '@heroui/react';
import { Pencil, Trash2, Unlink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PairedClient } from '@/features/clients/domain/client';
import { PermissionBadge } from './PermissionBadge';

export interface ClientRowProps {
  client: PairedClient;
  onDisconnect: (uuid: string) => void;
  onEdit: (uuid: string) => void;
  onUnpair: (uuid: string) => void;
}

/** One paired device: permission badge, name, and the disconnect (when connected), edit and unpair actions. */
export function ClientRow({ client, onDisconnect, onEdit, onUnpair }: ClientRowProps) {
  const { t } = useTranslation();
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-separator px-4 py-3"
      data-testid={`client-${client.uuid}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <PermissionBadge perm={client.perm} testId="client-perm" />
        <span className="truncate font-semibold" data-testid="client-name">
          {client.name !== '' ? client.name : t('pin.unpair_single_unknown')}
        </span>
        {client.connected && (
          <Chip color="success" variant="soft" data-testid="client-connected">
            {t('pin.connected')}
          </Chip>
        )}
      </div>
      <div className="flex items-center gap-2">
        {client.connected && (
          <Button
            isIconOnly
            variant="secondary"
            aria-label={t('pin.disconnect_client')}
            data-testid="client-disconnect"
            onPress={() => onDisconnect(client.uuid)}
          >
            <Unlink aria-hidden="true" className="size-4" />
          </Button>
        )}
        <Button
          isIconOnly
          variant="secondary"
          aria-label={t('pin.edit_client')}
          data-testid="client-edit"
          onPress={() => onEdit(client.uuid)}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </Button>
        <Button
          isIconOnly
          variant="danger-soft"
          aria-label={t('pin.unpair_client')}
          data-testid="client-unpair"
          onPress={() => onUnpair(client.uuid)}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </li>
  );
}
