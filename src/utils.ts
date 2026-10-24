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
export const deepAssign = <T extends Record<string, unknown>>(
  ...sources: (Partial<T> | undefined)[]
): T => {
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
