/** Matches the leading number of a CSS length, e.g. `-1.5`, `.5` or `14` in `14px`. */
const LEADING_NUMBER_REGEXP = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iu;

/**
 * Parses the leading number of a string, so CSS lengths such as `14px` become `14`.
 *
 * @param value Text to parse.
 * @returns The leading number, or `NaN` when the text does not start with a number.
 */
const parseLeadingNumber = (value: string): number => {
  const [match] = LEADING_NUMBER_REGEXP.exec(value.trim()) ?? [];

  return match == null ? Number.NaN : Number(match);
};

/**
 * Parses a numeric attribute value.
 *
 * @param value Raw attribute value (numbers or CSS lengths such as `14px`).
 * @param fallback Value returned when the input cannot be parsed as a finite number.
 * @returns The parsed number, or `fallback`.
 */
export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;

  const result = parseLeadingNumber(value);

  return Number.isFinite(result) ? result : fallback;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value != null && !Array.isArray(value);

/**
 * Deep-copies arrays and plain objects; every other value is returned as-is.
 *
 * @param value Value to copy.
 * @returns The copied value.
 */
const cloneValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item));

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) result[key] = cloneValue(item);

    return result;
  }

  return value;
};

/**
 * Recursively merges plain objects without mutating any of the sources. Later sources win; arrays
 * are copied (not merged).
 *
 * @param sources Objects to merge, in priority order.
 * @returns The merged object.
 */
export const deepAssign = <T extends object>(...sources: (Partial<T> | undefined)[]): T => {
  const result: Record<string, unknown> = {};

  for (const source of sources) {
    if (source == null) continue;

    for (const [key, value] of Object.entries(source)) {
      const existing = result[key];

      result[key] =
        isPlainObject(existing) && isPlainObject(value)
          ? deepAssign(existing, value)
          : cloneValue(value);
    }
  }

  return result as T;
};
