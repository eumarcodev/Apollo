/** Immutable list edits used by the command editors (same index semantics as the legacy `splice` calls). */

/** Insert `item` at `index` (before the current row at that index); a negative index appends. */
export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  if (index < 0 || index >= list.length) {
    return [...list, item];
  }
  return [...list.slice(0, index), item, ...list.slice(index)];
}

export function removeAt<T>(list: readonly T[], index: number): T[] {
  if (index < 0 || index >= list.length) {
    return [...list];
  }
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

export function replaceAt<T>(list: readonly T[], index: number, item: T): T[] {
  if (index < 0 || index >= list.length) {
    return [...list];
  }
  return list.map((current, i) => (i === index ? item : current));
}
