import { useCallback, useEffect, useState } from 'react';
import { RELOAD_DELAY_MS, type PasswordChange, type PasswordOutcome } from '@/features/password/domain/password-change';
import type { PasswordPort } from './ports';
import { submitPasswordChange } from './submit-password-change';

export interface PasswordChangeState {
  outcome: PasswordOutcome | null;
  pending: boolean;
  submit: (form: PasswordChange) => Promise<void>;
}

function reloadPage(): void {
  window.location.reload();
}

/** Submit state of the page; a successful change schedules a reload so the browser asks for the new credentials. */
export function usePasswordChange(port: PasswordPort, reload: () => void = reloadPage): PasswordChangeState {
  const [outcome, setOutcome] = useState<PasswordOutcome | null>(null);
  const [pending, setPending] = useState(false);
  const succeeded = outcome?.kind === 'success';

  useEffect(() => {
    if (!succeeded) {
      return undefined;
    }
    const timer = setTimeout(reload, RELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [succeeded, reload]);

  const submit = useCallback(
    async (form: PasswordChange) => {
      setOutcome(null);
      setPending(true);
      try {
        setOutcome(await submitPasswordChange(port, form));
      } finally {
        setPending(false);
      }
    },
    [port],
  );

  return { outcome, pending, submit };
}
