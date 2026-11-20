import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_WELCOME_USERNAME, validateNewCredentials } from '@/features/auth/domain/credentials';
import type { AuthApiPort, BrowserPort, CreateCredentialsOutcome } from './ports';

/** The legacy page reloads 5 s after the credentials are saved (the server then sends the browser to the login). */
export const WELCOME_RELOAD_DELAY_MS = 5000;

export interface WelcomeDeps {
  api: AuthApiPort;
  browser: BrowserPort;
  reloadDelayMs?: number;
}

export type WelcomeFeedback = CreateCredentialsOutcome | { kind: 'password-mismatch' };

export interface WelcomeFormState {
  newUsername: string;
  newPassword: string;
  confirmNewPassword: string;
  pending: boolean;
  feedback: WelcomeFeedback | null;
  setNewUsername(value: string): void;
  setNewPassword(value: string): void;
  setConfirmNewPassword(value: string): void;
  submit(): Promise<void>;
}

/** First-run credentials form: mismatch check, `POST ./api/password`, reload after a success. */
export function useWelcomeForm({
  api,
  browser,
  reloadDelayMs = WELCOME_RELOAD_DELAY_MS,
}: WelcomeDeps): WelcomeFormState {
  const [newUsername, setNewUsername] = useState(DEFAULT_WELCOME_USERNAME);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<WelcomeFeedback | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (reloadTimer.current !== null) {
        clearTimeout(reloadTimer.current);
      }
    },
    [],
  );

  const submit = useCallback(async () => {
    const credentials = { newUsername, newPassword, confirmNewPassword };
    if (validateNewCredentials(credentials) === 'password-mismatch') {
      setFeedback({ kind: 'password-mismatch' });
      return;
    }
    setFeedback(null);
    setPending(true);
    const outcome = await api.createCredentials(credentials);
    setPending(false);
    setFeedback(outcome);
    if (outcome.kind === 'saved') {
      reloadTimer.current = setTimeout(() => browser.reload(), reloadDelayMs);
    }
  }, [api, browser, reloadDelayMs, newUsername, newPassword, confirmNewPassword]);

  return {
    newUsername,
    newPassword,
    confirmNewPassword,
    pending,
    feedback,
    setNewUsername,
    setNewPassword,
    setConfirmNewPassword,
    submit,
  };
}
