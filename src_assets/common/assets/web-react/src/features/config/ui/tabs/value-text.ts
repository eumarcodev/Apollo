/**
 * Text shown by a `TextField` for an option value. The server sends strings, but the tab defaults of numeric options
 * are numbers (`qp: 28`), and `TextField` only shows strings: numbers are written as text here.
 */
export function textValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
}

/**
 * Value stored for a number input, like the legacy `v-model` of `<input type="number">` (Vue casts the text to a number
 * when it parses; anything else is kept as typed).
 */
export function numberValue(text: string): number | string {
  const trimmed = text.trim();
  if (trimmed === '') {
    return text;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : text;
}
