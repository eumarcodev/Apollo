import { Chip } from '@heroui/react';
import { Monitor, Smartphone } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from './ExternalLink';
import { SectionHeading } from './SectionHeading';

interface ClientEntry {
  id: string;
  platformKey: string;
  icon: ReactElement;
  /** Null: not available yet (no link). */
  name: string | null;
  link: string | null;
}

const CLIENTS: readonly ClientEntry[] = [
  {
    id: 'android',
    platformKey: 'client_card.platform_android',
    icon: <Smartphone aria-hidden="true" className="size-5" />,
    name: 'Selene',
    link: 'https://github.com/eumarcodev/Selene-Game-Streaming',
  },
  {
    id: 'ios',
    platformKey: 'client_card.platform_ios',
    icon: <Smartphone aria-hidden="true" className="size-5" />,
    name: null,
    link: null,
  },
  {
    id: 'desktop',
    platformKey: 'client_card.platform_desktop',
    icon: <Monitor aria-hidden="true" className="size-5" />,
    name: null,
    link: null,
  },
];

/** Clients tuned for Helios; only the Android one exists yet, the others are shown as coming soon. */
export function ClientsCard() {
  const { t } = useTranslation();
  return (
    <section className="helios-panel flex flex-col gap-6 rounded-2xl p-6" data-testid="clients-card">
      <SectionHeading title={t('client_card.clients')} description={t('client_card.clients_desc')} />
      <ul className="flex flex-col gap-3">
        {CLIENTS.map((client) => {
          const platform = t(client.platformKey);
          return (
            <li
              key={client.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-separator px-4 py-3"
              data-testid={`client-${client.id}`}
            >
              <span className="flex items-center gap-3 font-semibold">
                <span style={{ color: 'var(--helios-gold-text)' }}>{client.icon}</span>
                {platform}
              </span>
              {client.link && client.name ? (
                <ExternalLink href={client.link} variant="primary">
                  {client.name}
                </ExternalLink>
              ) : (
                <Chip size="md" variant="soft">
                  <Chip.Label>{t('client_card.coming_soon')}</Chip.Label>
                </Chip>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted italic">* {t('client_card.generic_moonlight_clients_desc')}</p>
    </section>
  );
}
