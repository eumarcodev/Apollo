import { Button, Checkbox, Form, Label } from '@heroui/react';
import { LogIn } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { LoginOutcome } from '@/features/auth/domain/login';
import { useLoginForm, type LoginDeps } from '@/features/auth/application/use-login-form';
import { AuthField, AuthHeader, ErrorFeedback, SuccessFeedback } from './AuthParts';

function failureMessage(outcome: Exclude<LoginOutcome, { kind: 'ok' }>, t: TFunction): string {
  switch (outcome.kind) {
    case 'unauthorized':
      return t('login.failed_credentials');
    case 'http':
      return t('login.failed_status', { status: outcome.status });
    case 'network':
      return t('login.failed_reason', { reason: outcome.reason });
  }
}

/** Login page: the server sends here (`/login?redir=./<page>`) when the session is missing or expired. */
export function LoginPage(deps: LoginDeps) {
  const { t } = useTranslation();
  const form = useLoginForm(deps);
  const { outcome } = form;
  return (
    <section className="helios-panel flex flex-col gap-8 rounded-2xl p-8" data-testid="login-page" data-page="login">
      <AuthHeader />
      <Form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        <AuthField
          id="username"
          label={t('_common.username')}
          value={form.username}
          onChange={form.setUsername}
          autoComplete="username"
          isRequired
          autoFocus
        />
        <AuthField
          id="password"
          type="password"
          label={t('_common.password')}
          value={form.password}
          onChange={form.setPassword}
          autoComplete="current-password"
          isRequired
        />
        <Checkbox id="save-password" isSelected={form.remember} onChange={form.setRemember}>
          <Checkbox.Content data-testid="save-password">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('login.save_password')}</Label>
          </Checkbox.Content>
        </Checkbox>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isDisabled={form.pending}
          data-testid="login-submit"
        >
          <LogIn aria-hidden="true" className="size-4" />
          {t('welcome.login')}
        </Button>
        {outcome && outcome.kind !== 'ok' && <ErrorFeedback message={failureMessage(outcome, t)} />}
        {outcome?.kind === 'ok' && <SuccessFeedback message={t('welcome.login_success')} />}
      </Form>
    </section>
  );
}
