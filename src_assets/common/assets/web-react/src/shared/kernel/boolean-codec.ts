/**
 * Boolean option codec, ported from the legacy Checkbox.vue.
 *
 * Config values arrive in many spellings (`true`, `1`, `"enabled"`, `"on"`...). The codec detects which pair the
 * current value uses and writes back the same representation, so saving a page never rewrites untouched options.
 */
export type BooleanLike = boolean | number | string;

export type BooleanPair = readonly [BooleanLike, BooleanLike];

const STRING_PAIRS: readonly BooleanPair[] = [
  ['true', 'false'],
  ['1', '0'],
  ['enabled', 'disabled'],
  ['enable', 'disable'],
  ['yes', 'no'],
  ['on', 'off'],
];

const FALLBACK_PAIR: BooleanPair = ['true', 'false'];

export interface BooleanRepresentation {
  pair: BooleanPair;
  /** The value as matched (strings lowercased and trimmed). */
  value: BooleanLike;
}

/** Find the boolean pair a value belongs to, or null when it matches none. */
export function mapToBoolRepresentation(value: unknown): BooleanRepresentation | null {
  if (value === true || value === false) {
    return { pair: [true, false], value };
  }
  if (value === 1 || value === 0) {
    return { pair: [1, 0], value };
  }
  const normalized = `${String(value)}`.toLowerCase().trim();
  for (const pair of STRING_PAIRS) {
    if (normalized === pair[0] || normalized === pair[1]) {
      return { pair, value: normalized };
    }
  }
  return null;
}

export interface BooleanCodec {
  truthy: BooleanLike;
  falsy: BooleanLike;
  /** False when the initial value matched no pair and the `"true"/"false"` fallback is used. */
  recognized: boolean;
  isOn(value: unknown): boolean;
  encode(on: boolean): BooleanLike;
}

/** Same comparison as Vue's `looseEqual` for primitives, used by the legacy checkbox `true-value`. */
function looseEqual(a: unknown, b: unknown): boolean {
  return a === b || String(a) === String(b);
}

export function createBooleanCodec(value: unknown, inverseValues = false): BooleanCodec {
  const representation = mapToBoolRepresentation(value);
  const pair = representation?.pair ?? FALLBACK_PAIR;
  const truthy = inverseValues ? pair[1] : pair[0];
  const falsy = inverseValues ? pair[0] : pair[1];
  return {
    truthy,
    falsy,
    recognized: representation !== null,
    isOn: (current) => looseEqual(current, truthy),
    encode: (on) => (on ? truthy : falsy),
  };
}

/** Parse a `default` prop to true/false, or null when it is not a boolean-like value. */
export function parseBooleanDefault(value: unknown): boolean | null {
  const representation = mapToBoolRepresentation(value);
  if (representation === null) {
    return null;
  }
  return representation.value === representation.pair[0];
}
