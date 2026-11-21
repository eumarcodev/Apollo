import { Toast } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { i18n as I18n } from 'i18next';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ConfirmProvider } from '@/shared/ui';
import { ErrorBoundary } from './ErrorBoundary';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
  });
}

export interface AppProvidersProps {
  i18n: I18n;
  queryClient: QueryClient;
  children: ReactNode;
}

/** Providers shared by every page: server state, translations, error boundary, confirm dialog and toasts. */
export function AppProviders({ i18n, queryClient, children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <ConfirmProvider>
            {children}
            <Toast.Provider placement="top end" />
          </ConfirmProvider>
        </ErrorBoundary>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
