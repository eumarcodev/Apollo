import { Alert, Button } from '@heroui/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl p-6" data-testid="error-boundary">
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t('_common.error')}</Alert.Title>
          <Alert.Description>{t('react_ui.unexpected_error')}</Alert.Description>
          <Button className="mt-2" size="sm" variant="danger" onPress={() => window.location.reload()}>
            {t('react_ui.reload')}
          </Button>
        </Alert.Content>
      </Alert>
    </div>
  );
}

interface State {
  failed: boolean;
}

/** Last-resort boundary so a render error shows a message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}
