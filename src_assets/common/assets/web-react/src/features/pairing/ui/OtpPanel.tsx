import { Alert, Button, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { KeyRound, SquarePen } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/shared/ui';
import type { HostCache } from '@/features/pairing/application/host-cache';
import type { PageEnvironment, PairingPort } from '@/features/pairing/application/ports';
import { useOtpPairing, type OtpPairing } from '@/features/pairing/application/use-otp-pairing';
import { canSaveHost, deepLinkLabel } from '@/features/pairing/domain/host-address';
import {
  currentDeepLink,
  messageStatus,
  PASSPHRASE_PATTERN,
  showsDeepLink,
  type OtpCode,
  type OtpMessage,
} from '@/features/pairing/domain/otp-pairing';

export interface OtpPanelProps {
  pairing: PairingPort;
  env: PageEnvironment;
  hostCache: HostCache;
}

function CodeText({ code }: { code: OtpCode }) {
  const { t } = useTranslation();
  switch (code.kind) {
    case 'none':
      return '????';
    case 'otp':
      return code.value;
    case 'expired':
      return t('pin.otp_expired');
  }
}

function MessageAlert({ message }: { message: OtpMessage }) {
  const { t } = useTranslation();
  const text =
    message.kind === 'error' ? message.text : t(message.kind === 'success' ? 'pin.otp_success' : 'pin.otp_expired_msg');
  return (
    <Alert status={messageStatus(message)} data-testid="otp-message" data-status={messageStatus(message)}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{text}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

/** HOST and PORT of the deep link, typed by hand; saving redraws the QR code and keeps them for the session. */
function HostEditor({ otp }: { otp: OtpPairing }) {
  const { t } = useTranslation();
  const { host } = otp.state;
  return (
    <div className="flex flex-col gap-4" data-testid="host-editor">
      <TextField value={host.hostAddr} onChange={otp.setHostAddr} autoFocus>
        <Label>{t('pin.host')}</Label>
        <Input data-testid="host-addr" />
      </TextField>
      <TextField value={host.hostPort} onChange={otp.setHostPort}>
        <Label>{t('pin.port')}</Label>
        <Input data-testid="host-port" inputMode="numeric" />
      </TextField>
      <Button
        variant="primary"
        className="self-start"
        isDisabled={!canSaveHost(host)}
        onPress={otp.saveHost}
        data-testid="host-save"
      >
        {t('_common.save')}
      </Button>
    </div>
  );
}

function OtpForm({ otp }: { otp: OtpPairing }) {
  const { t } = useTranslation();
  return (
    <Form
      className="flex flex-col gap-4"
      data-testid="otp-form"
      onSubmit={(event) => {
        event.preventDefault();
        void otp.submit();
      }}
    >
      <TextField
        name="passphrase"
        value={otp.state.passphrase}
        onChange={otp.setPassphrase}
        pattern={PASSPHRASE_PATTERN}
        isRequired
        autoFocus
      >
        <Label>{t('pin.otp_passphrase')}</Label>
        <Input data-testid="otp-passphrase" autoComplete="off" />
        <FieldError />
      </TextField>
      <TextField name="deviceName" value={otp.state.deviceName} onChange={otp.setDeviceName}>
        <Label>{t('pin.device_name')}</Label>
        <Input data-testid="otp-device-name" autoComplete="off" />
      </TextField>
      <Button type="submit" variant="primary" className="self-start" isPending={otp.pending} data-testid="otp-submit">
        <KeyRound aria-hidden="true" className="size-4" />
        {t('pin.generate_pin')}
      </Button>
    </Form>
  );
}

/** The code in large serif, and once there is an address the QR code of the deep link with its text and edit button. */
function CodeDisplay({ otp }: { otp: OtpPairing }) {
  const { t } = useTranslation();
  const { state } = otp;
  return (
    <div
      className="flex min-w-[17rem] flex-col items-center gap-4 rounded-2xl border border-separator px-6 py-8"
      data-testid="otp-display"
    >
      {showsDeepLink(state) && (
        <>
          {state.qrLink && (
            <div className="rounded-xl bg-white p-3 shadow-sm" data-testid="otp-qr" data-value={state.qrLink}>
              <QRCodeSVG value={state.qrLink} size={208} level="H" title={t('pin.qr_code')} />
            </div>
          )}
          <p className="flex items-center gap-1 text-sm text-muted">
            <a href={currentDeepLink(state)} className="underline-offset-4 hover:underline" data-testid="otp-link">
              {deepLinkLabel(state.host)}
            </a>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t('pin.edit_host')}
              aria-pressed={state.editingHost}
              onPress={otp.toggleHostEditing}
              data-testid="host-edit"
            >
              <SquarePen aria-hidden="true" className="size-4" />
            </Button>
          </p>
        </>
      )}
      <output
        className="helios-display helios-gold-text text-6xl tracking-[0.18em] lining-nums tabular-nums"
        data-testid="otp-code"
        data-kind={state.code.kind}
      >
        <CodeText code={state.code} />
      </output>
    </div>
  );
}

/** OTP tab: generate an OTP for a passphrase, show it with the QR code of the `art://` deep link. */
export function OtpPanel({ pairing, env, hostCache }: OtpPanelProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const askPairNow = useCallback(
    () => confirm({ title: t('pin.otp_pair_now'), confirmLabel: t('pin.pair_now'), status: 'accent' }),
    [confirm, t],
  );
  const otp = useOtpPairing({ pairing, env, hostCache, askPairNow });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex flex-col gap-4">
        {otp.state.editingHost ? <HostEditor otp={otp} /> : <OtpForm otp={otp} />}
        {otp.state.message && <MessageAlert message={otp.state.message} />}
      </div>
      <CodeDisplay otp={otp} />
    </div>
  );
}
