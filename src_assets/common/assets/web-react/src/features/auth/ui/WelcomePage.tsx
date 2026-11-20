import { Alert, Button, Form } from '@heroui/react';
import { KeyRound } from 'lucide-react';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { useWelcomeForm, type WelcomeDeps, type WelcomeFeedback } from '@/features/auth/application/use-welcome-form';
import { AuthField, AuthHeader, ErrorFeedback, SuccessFeedback } from './AuthParts';

export interface WelcomePageProps extends WelcomeDeps {
  /** Resources and legal links shown next to the form (the dashboard ResourceCard). */
  resources: ComponentType;
}

function Feedback({ feedback }: { feedback: WelcomeFeedback | null }) {
  const { t } = useTranslation();
  switch (feedback?.kind) {
    case 'password-mismatch':
      return <ErrorFeedback message={t('_common.password_mismatch')} />;
    case 'server-error':
      return <ErrorFeedback message={t('_common.internal_server_error')} />;
    case 'rejected':
      // The legacy page shows nothing when the server sends no error text.
      return feedback.error === '' ? null : <ErrorFeedback message={feedback.error} />;
    case 'saved':
      return <SuccessFeedback message={t('welcome.welcome_success')} />;
    default:
      return null;
  }
}

/**
 * First-run page: the server sends here while no credentials exist. Wider than the public layout column so the
 * resources sit next to the form on large screens (stacked below on narrow ones).
 */
export function WelcomePage({ resources: Resources, ...deps }: WelcomePageProps) {
  const { t } = useTranslation();
  const form = useWelcomeForm(deps);
  return (
    <div
      className="ml-[calc((100%-min(76rem,calc(100vw-2rem)))/2)] grid w-[min(76rem,calc(100vw-2rem))] items-start gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]"
      data-testid="welcome-page"
      data-page="welcome"
    >
      <section className="helios-panel flex flex-col gap-6 rounded-2xl p-8" data-testid="welcome-form-card">
        <AuthHeader />
        <p className="text-center text-muted">{t('welcome.create_creds')}</p>
        <Alert status="warning" data-testid="create-creds-alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t('welcome.create_creds_alert')}</Alert.Description>
          </Alert.Content>
        </Alert>
        <Form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.submit();
          }}
        >
          <AuthField
            id="new-username"
            label={t('_common.username')}
            value={form.newUsername}
            onChange={form.setNewUsername}
            autoComplete="username"
          />
          <AuthField
            id="new-password"
            type="password"
            label={t('_common.password')}
            value={form.newPassword}
            onChange={form.setNewPassword}
            autoComplete="new-password"
            isRequired
          />
          <AuthField
            id="confirm-password"
            type="password"
            label={t('welcome.confirm_password')}
            value={form.confirmNewPassword}
            onChange={form.setConfirmNewPassword}
            autoComplete="new-password"
            isRequired
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isDisabled={form.pending}
            data-testid="welcome-submit"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            {t('welcome.login')}
          </Button>
          <Feedback feedback={form.feedback} />
        </Form>
      </section>
      <Resources />
    </div>
  );
}
