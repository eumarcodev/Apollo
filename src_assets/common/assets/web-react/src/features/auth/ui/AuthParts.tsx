import { Alert, Input, Label, TextField } from '@heroui/react';
import { useTranslation } from 'react-i18next';

/** Logo and greeting at the top of the welcome and login cards. */
export function AuthHeader() {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <span className="helios-logo-tile grid size-16 place-items-center rounded-full">
        <img src="/images/logo-helios-45.png" alt="Helios" height={45} width={45} className="size-12" />
      </span>
      <h1 className="helios-display text-4xl">{t('welcome.greeting')}</h1>
      <div aria-hidden="true" className="helios-ornament w-40">
        <span className="helios-diamond" />
      </div>
    </header>
  );
}

export interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  autoComplete: string;
  isRequired?: boolean;
  autoFocus?: boolean;
}

/** Labelled text input of the auth forms (native `required` validation, as on the legacy pages). */
export function AuthField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  isRequired = false,
  autoFocus = false,
}: AuthFieldProps) {
  return (
    <TextField
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      isRequired={isRequired}
      fullWidth
    >
      <Label>{label}</Label>
      <Input data-testid={id} autoFocus={autoFocus} />
    </TextField>
  );
}

/** Error alert with the legacy "Error!" title. */
export function ErrorFeedback({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <Alert status="danger" data-testid="auth-error">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t('_common.error')}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

/** Success alert with the legacy "Success!" title. */
export function SuccessFeedback({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <Alert status="success" data-testid="auth-success">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t('_common.success')}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
