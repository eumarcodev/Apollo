import { Alert, Tabs } from '@heroui/react';
import { Hash, KeyRound } from 'lucide-react';
import { useState, type Key } from 'react';
import { useTranslation } from 'react-i18next';
import { HostCache } from '@/features/pairing/application/host-cache';
import type { HostInfoStore, PageEnvironment, PairingPort } from '@/features/pairing/application/ports';
import { isPairingTab, tabFromHash, type PairingTab } from '@/features/pairing/domain/pairing-tab';
import { OtpPanel } from './OtpPanel';
import { PinPanel } from './PinPanel';

export interface PairingSectionProps {
  pairing: PairingPort;
  hostStore: HostInfoStore;
  env: PageEnvironment;
  /** Called after a PIN pairing so the page can refresh its client list. */
  onPaired?: (() => void) | undefined;
}

/**
 * Pairing card of the PIN page: OTP and PIN tabs (the active one follows `location.hash`), the OTP notice and the
 * security warning. A tab switch starts the tab over and forgets the host kept in memory, as on the legacy page.
 */
export function PairingSection({ pairing, hostStore, env, onPaired }: PairingSectionProps) {
  const { t } = useTranslation();
  const [hostCache] = useState(() => new HostCache(hostStore));
  const [tab, setTab] = useState<PairingTab>(() => tabFromHash(env.hash()));

  const select = (key: Key) => {
    if (!isPairingTab(key) || key === tab) {
      return;
    }
    env.setHash(key);
    hostCache.clear();
    setTab(key);
  };

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      data-testid="pairing"
    >
      <section className="helios-panel flex flex-col gap-6 rounded-2xl p-6" data-testid="pairing-card">
        <Tabs selectedKey={tab} onSelectionChange={select} align="start">
          <Tabs.ListContainer>
            <Tabs.List aria-label={t('navbar.pin')}>
              <Tabs.Tab id="OTP" className="gap-2" data-testid="tab-otp">
                <KeyRound aria-hidden="true" className="size-4" />
                {t('pin.otp_pairing')}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="PIN" className="gap-2" data-testid="tab-pin">
                <Hash aria-hidden="true" className="size-4" />
                {t('pin.pin_pairing')}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="OTP" className="pt-6" data-testid="panel-otp">
            <OtpPanel pairing={pairing} env={env} hostCache={hostCache} />
          </Tabs.Panel>
          <Tabs.Panel id="PIN" className="pt-6" data-testid="panel-pin">
            <PinPanel pairing={pairing} onPaired={onPaired} />
          </Tabs.Panel>
        </Tabs>
      </section>
      <aside className="flex flex-col gap-4" data-testid="pairing-notes">
        {tab === 'OTP' && (
          <Alert status="accent" data-testid="otp-info">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{t('pin.otp_msg')}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        <Alert status="warning" data-testid="pairing-warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('_common.warning')}</Alert.Title>
            <Alert.Description>{t('pin.warning_msg')}</Alert.Description>
          </Alert.Content>
        </Alert>
      </aside>
    </div>
  );
}
