import { AlertDialog, Button } from '@heroui/react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type ConfirmStatus = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  status?: ConfirmStatus;
  onConfirm: () => void;
  onCancel?: () => void;
}

/** Confirmation dialog (HeroUI AlertDialog) that replaces `window.confirm`. */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  status = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[440px]" data-testid="confirm-dialog">
          <AlertDialog.Header>
            <AlertDialog.Icon status={status} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          {body !== undefined && <AlertDialog.Body>{body}</AlertDialog.Body>}
          <AlertDialog.Footer>
            {/* The answer is reported before the dialog closes, so a close is never mistaken for a cancel. */}
            <Button
              variant="tertiary"
              data-testid="confirm-cancel"
              onPress={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              {cancelLabel ?? t('_common.cancel')}
            </Button>
            <Button
              variant={status === 'danger' ? 'danger' : 'primary'}
              data-testid="confirm-accept"
              onPress={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel ?? t('_common.apply')}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

export interface ConfirmRequest {
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  status?: ConfirmStatus;
}

export type ConfirmFn = (request: ConfirmRequest) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Mount once per page (done by createPage); `useConfirm()` then works anywhere below it. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);

  const settle = useCallback((accepted: boolean) => {
    resolver.current?.(accepted);
    resolver.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback<ConfirmFn>((next) => {
    // A pending confirmation is answered "no" when a new one replaces it.
    resolver.current?.(false);
    setRequest(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              settle(false);
            }
          }}
          title={request.title}
          body={request.body}
          confirmLabel={request.confirmLabel}
          cancelLabel={request.cancelLabel}
          status={request.status}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/** Promise-based replacement for `window.confirm`. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return confirm;
}
