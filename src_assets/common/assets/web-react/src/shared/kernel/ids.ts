/** Build a stable DOM id from parts (`fieldId('prep', 'cmd', 2)` -> `prep-cmd-2`). Empty parts are skipped. */
export function fieldId(...parts: ReadonlyArray<string | number | null | undefined>): string {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map((part) => String(part).trim().replace(/\s+/g, '-'))
    .join('-');
}
