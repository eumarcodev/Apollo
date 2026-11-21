import { createElement } from 'react';
import { ResourceCard } from '@/features/dashboard';
import { createAuthApi, createBrowser, createSavedLogin } from './infrastructure/adapters';
import { LoginPage as LoginPageView } from './ui/LoginPage';
import { WelcomePage as WelcomePageView } from './ui/WelcomePage';

const api = createAuthApi();
const browser = createBrowser();
const savedLogin = createSavedLogin();

/** `/login` wired to the real host API, `localStorage.login` and `window.location`. */
export function LoginPage() {
  return createElement(LoginPageView, { api, savedLogin, browser });
}

/** `/welcome` (first run) wired to the real host API and `window.location`. */
export function WelcomePage() {
  return createElement(WelcomePageView, { api, browser, resources: ResourceCard });
}
