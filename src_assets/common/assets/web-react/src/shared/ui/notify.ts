import { toast } from '@heroui/react';
import type { ReactNode } from 'react';

export interface NotifyOptions {
  description?: ReactNode;
  /** Milliseconds; 0 keeps the toast open until closed. Default 4000 (HeroUI default). */
  timeout?: number;
}

type ToastFn = (title: ReactNode, options?: NotifyOptions) => string;

/** Toast helper (HeroUI Toast) that replaces `window.alert`; needs `<Toast.Provider />`, mounted by createPage. */
export const notify: Record<'info' | 'success' | 'warning' | 'error', ToastFn> = {
  info: (title, options) => toast.info(title, options),
  success: (title, options) => toast.success(title, options),
  warning: (title, options) => toast.warning(title, options),
  error: (title, options) => toast.danger(title, options),
};
