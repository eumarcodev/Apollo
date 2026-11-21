export type AppErrorKind = 'network' | 'http' | 'unauthorized' | 'parse' | 'unknown';

export interface AppErrorOptions {
  status?: number;
  body?: unknown;
  cause?: unknown;
}

/** Typed error used across the app; infrastructure adapters only throw this type. */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status: number | undefined;
  readonly body: unknown;

  constructor(kind: AppErrorKind, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.kind = kind;
    this.status = options.status;
    this.body = options.body;
  }

  static from(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }
    if (error instanceof Error) {
      return new AppError('unknown', error.message, { cause: error });
    }
    return new AppError('unknown', String(error));
  }
}
