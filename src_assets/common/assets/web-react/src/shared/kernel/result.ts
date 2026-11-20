import { AppError } from './app-error';

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Run a promise and capture a rejection as an AppError result instead of throwing. */
export async function toResult<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    return ok(await promise);
  } catch (error) {
    return err(AppError.from(error));
  }
}
