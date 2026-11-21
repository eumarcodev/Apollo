import { Alert, AlertDialog, Button, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { Send } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PairingPort } from '@/features/pairing/application/ports';
import { usePinPairing } from '@/features/pairing/application/use-pin-pairing';
import { PIN_PATTERN } from '@/features/pairing/domain/otp-pairing';

export interface PinPanelProps {
  pairing: PairingPort;
  onPaired?: (() => void) | undefined;
}

/** After a pairing: the new client starts with limited permissions (replaces the legacy `alert`). */
function PairedNotice({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[440px]" data-testid="paired-notice">
          <AlertDialog.Header>
            <AlertDialog.Icon status="success" />
            <AlertDialog.Heading>{t('_common.success')}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>{t('pin.pair_success_check_perm')}</AlertDialog.Body>
          <AlertDialog.Footer>
            <Button variant="primary" data-testid="paired-notice-dismiss" onPress={() => onOpenChange(false)}>
              {t('_common.dismiss')}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

/** PIN tab: send the PIN a client shows to the host. */
export function PinPanel({ pairing, onPaired }: PinPanelProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const notifyPaired = useCallback(() => setNoticeOpen(true), []);
  const { status, pending, submit } = usePinPairing({ pairing, onPaired, notifyPaired });

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Form
        className="flex flex-col gap-4"
        data-testid="pin-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit({ pin, name }).then((accepted) => {
            if (accepted) {
              setPin('');
              setName('');
            }
          });
        }}
      >
        <TextField name="pin" value={pin} onChange={setPin} pattern={PIN_PATTERN} isRequired autoFocus>
          <Label>{t('navbar.pin')}</Label>
          <Input data-testid="pin-input" inputMode="numeric" autoComplete="off" />
          <FieldError />
        </TextField>
        <TextField name="name" value={name} onChange={setName}>
          <Label>{t('pin.device_name')}</Label>
          <Input data-testid="pin-device-name" autoComplete="off" />
        </TextField>
        <Button type="submit" variant="primary" className="self-start" isPending={pending} data-testid="pin-submit">
          <Send aria-hidden="true" className="size-4" />
          {t('pin.send')}
        </Button>
      </Form>
      {status && (
        <Alert
          status={status === 'success' ? 'success' : 'danger'}
          data-testid="pin-status"
          data-status={status}
          role="alert"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t(status === 'success' ? 'pin.pair_success' : 'pin.pair_failure')}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <PairedNotice isOpen={noticeOpen} onOpenChange={setNoticeOpen} />
    </div>
  );
}
