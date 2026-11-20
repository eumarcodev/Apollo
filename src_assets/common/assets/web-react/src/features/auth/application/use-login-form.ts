import { useCallback, useState } from 'react';
import type { LoginCredentials } from '@/features/auth/domain/credentials';
import {
  parseSavedLogin,
  readRedirectParam,
  resolveLoginRedirect,
  serializeSavedLogin,
  type LoginOutcome,
} from '@/features/auth/domain/login';
import type { AuthApiPort, BrowserPort, SavedLoginPort } from './ports';

export interface LoginDeps {
  api: AuthApiPort;
  savedLogin: SavedLoginPort;
  browser: BrowserPort;
}

/**
 * Login use case, in the legacy order: forget the saved credentials when "remember" is off, post them, and on
 * success remember them (when asked) and go to the requested page (`redir`, guarded) keeping the hash.
 */
export async function performLogin(
  deps: LoginDeps,
  credentials: LoginCredentials,
  remember: boolean,
): Promise<LoginOutcome> {
  if (!remember) {
    deps.savedLogin.remove();
  }
  const outcome = await deps.api.login(credentials);
  if (outcome.kind === 'ok') {
    if (remember) {
      deps.savedLogin.write(serializeSavedLogin(credentials));
    }
    deps.browser.assign(resolveLoginRedirect(readRedirectParam(deps.browser.search()), deps.browser.hash()));
  }
  return outcome;
}

export interface LoginFormState {
  username: string;
  password: string;
  remember: boolean;
  pending: boolean;
  outcome: LoginOutcome | null;
  setUsername(value: string): void;
  setPassword(value: string): void;
  setRemember(value: boolean): void;
  submit(): Promise<void>;
}

/** Login form state, prefilled from `localStorage.login` when it holds valid credentials. */
export function useLoginForm(deps: LoginDeps): LoginFormState {
  const [saved] = useState(() => parseSavedLogin(deps.savedLogin.read()));
  const [username, setUsername] = useState(saved?.username ?? '');
  const [password, setPassword] = useState(saved?.password ?? '');
  const [remember, setRemember] = useState(saved !== null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<LoginOutcome | null>(null);

  const submit = useCallback(async () => {
    setOutcome(null);
    setPending(true);
    const result = await performLogin(deps, { username, password }, remember);
    setPending(false);
    setOutcome(result);
  }, [deps, username, password, remember]);

  return {
    username,
    password,
    remember,
    pending,
    outcome,
    setUsername,
    setPassword,
    setRemember,
    submit,
  };
}
