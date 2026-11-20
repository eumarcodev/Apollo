/** Charset named by a `Content-Type` header (`text/plain; charset=GBK`), utf-8 when the header names none. */
export function charsetOf(contentType: string | null | undefined): string {
  const match = /charset=([^;]+)/i.exec(contentType ?? '');
  return match?.[1] ? match[1].trim() : 'utf-8';
}

/** Decode a log body with the charset of its `Content-Type` (throws RangeError for a charset the runtime lacks). */
export function decodeLogBody(body: ArrayBuffer, contentType: string | null | undefined): string {
  return new TextDecoder(charsetOf(contentType)).decode(body);
}

/** Lines that contain `filter` (case-sensitive); the whole text when the filter is empty. */
export function filterLogLines(logs: string, filter: string): string {
  if (!filter) {
    return logs;
  }
  return logs
    .split('\n')
    .filter((line) => line.includes(filter))
    .join('\n');
}
