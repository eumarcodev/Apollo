import { createElement } from 'react';
import { createPasswordApi } from './infrastructure/adapters';
import { PasswordPage as PasswordPageView } from './ui/PasswordPage';

const port = createPasswordApi();

/** Change-password page wired to the real adapter (`POST ./api/password`). */
export function PasswordPage() {
  return createElement(PasswordPageView, { port });
}
