import type { LineStyle } from "./options.js";
import { codePointOf } from "./utils.js";

// ASCII control characters are stripped by browsers while parsing URLs.
const isControlCharacter = (code: number): boolean => code <= 0x1f || code === 0x7f;

const hasControlCharacters = (value: string): boolean => {
  for (const character of value) {
    const codePoint = codePointOf(character);

    if (isControlCharacter(codePoint)) return true;
  }

  return false;
};

const stripControlCharacters = (value: string): string => {
  let result = "";

  for (const character of value) {
    const codePoint = codePointOf(character);

    if (!isControlCharacter(codePoint)) result += character;
  }

  return result;
};

const LINK_LENGTH_LIMIT = 4096;
const TARGET_LENGTH_LIMIT = 256;
const VALUE_LENGTH_LIMIT = 1024;
const DOM_ID_LENGTH_LIMIT = 128;

const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const LINK_SCHEME_PATTERN = /^(?<scheme>[a-z][a-z0-9+.-]*):/iu;
const TARGET_PATTERN = /^(?:_(?:blank|self|parent|top)|blank|[A-Za-z0-9][A-Za-z0-9_.-]*)$/u;
const DOM_ID_PATTERN = /^[A-Za-z0-9_-]+$/u;
const LOCAL_URL_PATTERN = /^url\(\s*['"]?#[^'")\s]+['"]?\s*\)$/iu;
const UNSAFE_VALUE_SCHEME_PATTERN = /(?:javascript|vbscript|data)\s*:/iu;

/** Attributes that can execute script, load subresources or change element structure. */
const UNSAFE_LINE_STYLE_ATTRIBUTES = new Set([
  "href",
  "xlink:href",
  "src",
  "style",
  "filter",
  "mask",
  "clip-path",
  "marker",
  "marker-start",
  "marker-mid",
  "marker-end",
  "path",
  "d",
  "transform",
  "id",
  "class",
  "xmlns",
  "target",
  "rel",
  // SVG animation (SMIL) attributes can trigger side effects.
  "begin",
  "end",
  "dur",
  "values",
  "from",
  "to",
  "by",
  "attributeName",
  "repeatCount",
  "repeatDur",
  "keyTimes",
  "keySplines",
  "calcMode",
]);

/** Presentation attributes that are safe on connection paths. */
const SAFE_LINE_STYLE_ATTRIBUTES = new Set([
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "fill",
  "fill-opacity",
  "fill-rule",
  "opacity",
  "visibility",
  "color",
  "shape-rendering",
  "pointer-events",
  "arrow-end",
  "arrow-start",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "cursor",
]);

const CURSOR_KEYWORDS = new Set([
  "auto",
  "default",
  "none",
  "context-menu",
  "help",
  "pointer",
  "progress",
  "wait",
  "cell",
  "crosshair",
  "text",
  "vertical-text",
  "alias",
  "copy",
  "move",
  "no-drop",
  "not-allowed",
  "grab",
  "grabbing",
  "e-resize",
  "n-resize",
  "ne-resize",
  "nw-resize",
  "s-resize",
  "se-resize",
  "sw-resize",
  "w-resize",
  "ew-resize",
  "ns-resize",
  "nesw-resize",
  "nwse-resize",
  "col-resize",
  "row-resize",
  "all-scroll",
  "zoom-in",
  "zoom-out",
]);

/** Error thrown when DSL input would be unsafe to render. */
export class FlowchartSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowchartSecurityError";
  }
}

const contextSuffix = (context?: string): string =>
  context == null ? "" : ` for node "${context}"`;

/**
 * Validates and normalizes a node link.
 *
 * Only `http:`, `https:`, `mailto:` and `tel:` are allowed as explicit protocols; relative URLs
 * (including protocol-relative `//host/path`) are allowed. Control characters are stripped before
 * checking so obfuscated schemes such as `java\nscript:` are rejected.
 *
 * @param raw Raw link from the DSL.
 * @param context Node key used in the error message.
 * @returns The normalized link, or `null` when the link is empty.
 * @throws {FlowchartSecurityError} When the link contains an unsafe protocol.
 */
export const validateLink = (raw: string, context?: string): string | null => {
  const value = stripControlCharacters(raw).trim();
  const suffix = contextSuffix(context);

  if (value === "") return null;

  if (value.length > LINK_LENGTH_LIMIT) {
    throw new FlowchartSecurityError(
      `Link exceeds the ${LINK_LENGTH_LIMIT}-character limit${suffix}.`,
    );
  }

  const scheme = LINK_SCHEME_PATTERN.exec(value)?.groups?.scheme?.toLowerCase();

  if (scheme == null) return value;

  const protocol = `${scheme}:`;

  if (!ALLOWED_LINK_PROTOCOLS.has(protocol))
    throw new FlowchartSecurityError(`Unsafe link protocol "${protocol}"${suffix}.`);

  return value;
};

/**
 * Validates a link target (`_blank`, `blank`, named browsing context, ...).
 *
 * @param raw Raw target from the DSL.
 * @param context Node key used in the error message.
 * @returns The normalized target, or `null` when no target is configured.
 * @throws {FlowchartSecurityError} When the target contains unsupported characters.
 */
export const validateTarget = (raw: string, context?: string): string | null => {
  const value = stripControlCharacters(raw).trim();
  const suffix = contextSuffix(context);

  if (value === "") return null;

  if (value.length > TARGET_LENGTH_LIMIT) {
    throw new FlowchartSecurityError(
      `Link target exceeds the ${TARGET_LENGTH_LIMIT}-character limit${suffix}.`,
    );
  }

  if (!TARGET_PATTERN.test(value))
    throw new FlowchartSecurityError(`Unsafe link target "${value}"${suffix}.`);

  return value;
};

/**
 * Runtime counterpart of {@link validateLink}: never throws, returns `null` for unsafe values.
 *
 * @param raw Raw link.
 * @returns The normalized link, or `null` when it is empty or unsafe.
 */
export const toSafeLink = (raw: string): string | null => {
  try {
    return validateLink(raw);
  } catch {
    return null;
  }
};

/**
 * Runtime counterpart of {@link validateTarget}: never throws.
 *
 * @param raw Raw target.
 * @returns The normalized target, or `null` when it is empty or unsafe.
 */
export const toSafeTarget = (raw: string): string | null => {
  try {
    return validateTarget(raw);
  } catch {
    return null;
  }
};

const isEventHandlerAttribute = (name: string): boolean => name.toLowerCase().startsWith("on");

const validateStyleValue = (name: string, value: unknown): string | number => {
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new FlowchartSecurityError(`Invalid numeric value for line style "${name}".`);

    return value;
  }

  if (typeof value !== "string")
    throw new FlowchartSecurityError(`Line style "${name}" must be a string or a finite number.`);

  if (hasControlCharacters(value))
    throw new FlowchartSecurityError(`Line style "${name}" contains control characters.`);

  if (value.length > VALUE_LENGTH_LIMIT) {
    throw new FlowchartSecurityError(
      `Line style "${name}" exceeds the ${VALUE_LENGTH_LIMIT}-character limit.`,
    );
  }

  if (UNSAFE_VALUE_SCHEME_PATTERN.test(value))
    throw new FlowchartSecurityError(`Line style "${name}" contains an unsafe URL scheme.`);

  if (
    (name === "fill" || name === "stroke") &&
    value.toLowerCase().includes("url(") &&
    !LOCAL_URL_PATTERN.test(value)
  ) {
    throw new FlowchartSecurityError(
      `Line style "${name}" may only reference local paint servers (url(#id)).`,
    );
  }

  if (name === "cursor" && !CURSOR_KEYWORDS.has(value.toLowerCase()))
    throw new FlowchartSecurityError(`Unsupported cursor value "${value}".`);

  return value;
};

/**
 * Filters a parsed `lineStyle` JSON object down to safe presentation attributes.
 *
 * Unsafe attribute names (event handlers, URLs, structure, SMIL, ...) throw; unknown attributes are
 * ignored so existing benign extensions do not fail rendering.
 *
 * @param style Parsed JSON value from a `@>` line.
 * @returns A new object containing only safe attributes.
 * @throws {FlowchartSecurityError} When the style is not an object or contains unsafe values.
 */
export const sanitizeLineStyle = (style: unknown): LineStyle => {
  if (typeof style !== "object" || style == null || Array.isArray(style))
    throw new FlowchartSecurityError("Line style must be a JSON object.");

  const result: LineStyle = {};

  for (const [rawName, rawValue] of Object.entries(style)) {
    const name = rawName.toLowerCase();

    if (isEventHandlerAttribute(name) || UNSAFE_LINE_STYLE_ATTRIBUTES.has(name))
      throw new FlowchartSecurityError(`Unsafe line style attribute "${rawName}".`);

    // Unknown attributes are ignored: the DSL only supports the documented presentation list.
    if (!SAFE_LINE_STYLE_ATTRIBUTES.has(name)) continue;

    result[name] = validateStyleValue(name, rawValue);
  }

  return result;
};

/**
 * Whether a node key can be used as a DOM id without breaking selectors or clobbering globals.
 *
 * @param key Node key.
 * @returns Whether the key is safe as an id.
 */
export const isSafeDomId = (key: string): boolean =>
  key.length > 0 && key.length <= DOM_ID_LENGTH_LIMIT && DOM_ID_PATTERN.test(key);
