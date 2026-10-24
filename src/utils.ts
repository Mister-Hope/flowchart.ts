import { merge } from "ts-deepmerge";

/** Arrays are replaced (not concatenated) and `undefined` still overrides, as before. */
const MERGE_OPTIONS = { mergeArrays: false, uniqueArrayItems: false };

/**
 * Recursively merges plain objects without mutating any of the sources. Later sources win; arrays
 * are replaced (not merged).
 *
 * Uses `ts-deepmerge`, which also skips prototype-polluting keys (`__proto__`, `constructor`, ...).
 *
 * @param sources Objects to merge, in priority order.
 * @returns The merged object.
 */
export const deepAssign = <T extends Record<string, unknown>>(
  ...sources: (Partial<T> | undefined)[]
): T => {
  const definedSources = sources.filter((source): source is Partial<T> => source != null);

  // The package generic cannot express our index-signature based option types.
  return merge.withOptions(MERGE_OPTIONS, ...definedSources) as T;
};
