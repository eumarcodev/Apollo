/**
 * Reusable field components for the configuration tabs (#168-#174). Import them from here inside the config slice:
 *
 * - `BooleanField` (from shared/ui): switch of a boolean option, keeps the value spelling (`enabled`, `true`, `1`...).
 * - `SelectField`: labelled select of an option; choices are `{ value, label (i18n key) }`.
 * - `TextField`: labelled text input (`monospace` for commands and paths).
 * - `CommandListField`: titled section around `CommandListEditor` for a command-list option.
 */
export { BooleanField } from '@/shared/ui';
export type { BooleanFieldProps } from '@/shared/ui';
export { CommandListField } from './CommandListField';
export type { CommandListFieldProps } from './CommandListField';
export { SelectField } from './SelectField';
export type { SelectFieldProps } from './SelectField';
export { TextField } from './TextField';
export type { ConfigTextFieldProps } from './TextField';
