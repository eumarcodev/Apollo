import {
  hasPasswordMismatch,
  interpretPasswordResponse,
  type PasswordChange,
  type PasswordOutcome,
} from '@/features/password/domain/password-change';
import type { PasswordPort } from './ports';

/** Validates the confirmation (no request on mismatch), then sends the change and maps the answer to an outcome. */
export async function submitPasswordChange(
  port: PasswordPort,
  form: PasswordChange,
  signal?: AbortSignal,
): Promise<PasswordOutcome> {
  if (hasPasswordMismatch(form)) {
    return { kind: 'mismatch' };
  }
  try {
    return interpretPasswordResponse(await port.change(form, signal));
  } catch (error) {
    // Like the legacy page, any non-200 answer (or a dropped request) is one generic failure.
    console.error(error);
    return { kind: 'failed' };
  }
}
