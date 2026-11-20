import { Alert, Button, Description, Input, Label, Spinner, TextField } from '@heroui/react';
import { KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PasswordPort } from '@/features/password/application/ports';
import { usePasswordChange } from '@/features/password/application/use-password-change';
import {
  emptyPasswordChange,
  type PasswordChange,
  type PasswordOutcome,
} from '@/features/password/domain/password-change';
import { PageLayout } from '@/shared/ui';

export interface PasswordPageProps {
  port: PasswordPort;
  /** Called five seconds after a successful change; defaults to reloading the page. */
  reload?: () => void;
}

interface FieldProps {
  name: keyof PasswordChange;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  autoComplete?: string;
  required?: boolean;
  description?: string;
}

function Field({ name, label, value, onChange, type = 'text', autoComplete, required, description }: FieldProps) {
  return (
    <TextField
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      isRequired={required === true}
      fullWidth
      {...(autoComplete ? { autoComplete } : {})}
    >
      <Label>{label}</Label>
      <Input data-testid={name} />
      {description !== undefined && <Description>{description}</Description>}
    </TextField>
  );
}

function Panel({
  icon,
  title,
  testId,
  children,
}: {
  icon: ReactNode;
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="helios-panel flex flex-col gap-6 rounded-2xl p-6" data-testid={testId}>
      <h2 className="helios-display flex items-center gap-3 text-3xl lining-nums">
        <span aria-hidden="true" className="text-accent">
          {icon}
        </span>
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function OutcomeAlert({ outcome }: { outcome: PasswordOutcome | null }) {
  const { t } = useTranslation();
  if (outcome === null) {
    return null;
  }
  if (outcome.kind === 'success') {
    return (
      <Alert status="success" data-testid="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t('_common.success')}</Alert.Title>
          <Alert.Description>{t('password.success_msg')}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }
  const message =
    outcome.kind === 'mismatch'
      ? t('_common.password_mismatch')
      : outcome.kind === 'failed'
        ? t('_common.internal_server_error')
        : outcome.message;
  return (
    <Alert status="danger" data-testid="error">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t('_common.error')}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

/** Change the web UI username and password: current credentials on the left, the new ones on the right. */
export function PasswordPage({ port, reload }: PasswordPageProps) {
  const { t } = useTranslation();
  const { outcome, pending, submit } = usePasswordChange(port, reload);
  const [form, setForm] = useState<PasswordChange>(emptyPasswordChange);
  const set = (name: keyof PasswordChange) => (value: string) =>
    setForm((previous) => ({ ...previous, [name]: value }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(form);
  }

  return (
    <PageLayout title={t('password.password_change')}>
      <form className="flex flex-col gap-6" onSubmit={onSubmit} data-testid="password-form">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
          <Panel icon={<ShieldCheck className="size-7" />} title={t('password.current_creds')} testId="current-creds">
            <Field
              name="currentUsername"
              label={t('_common.username')}
              value={form.currentUsername}
              onChange={set('currentUsername')}
              required
            />
            <Field
              name="currentPassword"
              label={t('_common.password')}
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={set('currentPassword')}
            />
          </Panel>
          <Panel icon={<KeyRound className="size-7" />} title={t('password.new_creds')} testId="new-creds">
            <Field
              name="newUsername"
              label={t('_common.username')}
              description={t('password.new_username_desc')}
              value={form.newUsername}
              onChange={set('newUsername')}
            />
            <Field
              name="newPassword"
              label={t('_common.password')}
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={set('newPassword')}
              required
            />
            <Field
              name="confirmNewPassword"
              label={t('password.confirm_password')}
              type="password"
              autoComplete="new-password"
              value={form.confirmNewPassword}
              onChange={set('confirmNewPassword')}
              required
            />
          </Panel>
        </div>
        <OutcomeAlert outcome={outcome} />
        <div>
          <Button type="submit" variant="primary" isPending={pending} data-testid="save">
            {({ isPending }) => (
              <>
                {isPending ? <Spinner size="sm" color="current" /> : <Save aria-hidden="true" className="size-4" />}
                {t('_common.save')}
              </>
            )}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
