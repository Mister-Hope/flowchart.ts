import type { BBox } from "./types.js";
import { SVG_NAMESPACE } from "./types.js";

/**
 * Font metrics are only needed when the environment cannot measure text natively (SSR, `happy-dom`,
 * `jsdom`, ...). Browsers always take the native `getBBox()` path, so the approximation below only
 * has to be good enough to keep layout deterministic.
 */
const NARROW_CHARS = "ilj|!.,:;'`()[]{}";
const MEDIUM_CHARS = "fr tI-";
const WIDE_CHARS = "mwMW@%&";
const DIGIT_CHARS = "0123456789";

const charWidthFactor = (char: string): number => {
  const codePoint = char.codePointAt(0) ?? 0;

  // CJK, full-width punctuation and emoji: roughly one em per character.
  if (codePoint >= 0x2e80) return 1;
  if (char === " ") return 0.28;
  if (NARROW_CHARS.includes(char)) return 0.3;
  if (MEDIUM_CHARS.includes(char)) return 0.4;
  if (WIDE_CHARS.includes(char)) return 0.9;
  if (DIGIT_CHARS.includes(char)) return 0.56;
  if (char >= "A" && char <= "Z") return 0.68;

  return 0.52;
};

export const estimateTextWidth = (text: string, fontSize: number): number => {
  let factor = 0;

  for (const char of text) factor += charWidthFactor(char);

  return factor * fontSize;
};

export const textLineHeight = (fontSize: number): number => fontSize * 1.2;

/**
 * Height of a text block rendered by the browser for the given font size and line count.
 *
 * @param lineCount Number of text lines.
 * @param fontSize Font size in pixels.
 * @returns The estimated height in pixels.
 */
export const estimateTextHeight = (lineCount: number, fontSize: number): number =>
  (lineCount - 1) * textLineHeight(fontSize) + fontSize * 1.15;

let nativeBBoxSupport: boolean | undefined;

/**
 * Whether the current DOM implementation can measure SVG geometry. `happy-dom` and `jsdom` do not
 * implement `getBBox()`, so they fall back to estimates.
 *
 * @returns Whether native SVG geometry measurement is available.
 */
export const supportsNativeBBox = (): boolean => {
  if (nativeBBoxSupport != null) return nativeBBoxSupport;
  if (typeof document === "undefined" || document.body == null) return false;

  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  const text = document.createElementNS(SVG_NAMESPACE, "text");

  text.setAttribute("font-size", "10");
  text.textContent = "M";
  svg.append(text);
  document.body.append(svg);

  try {
    const box = (text as SVGGraphicsElement).getBBox();

    nativeBBoxSupport = box.width > 0;
  } catch {
    nativeBBoxSupport = false;
  }

  svg.remove();

  return nativeBBoxSupport;
};

export const measureNativeBBox = (node: SVGGraphicsElement): BBox | null => {
  if (!supportsNativeBBox()) return null;

  // A detached element has no layout, so browsers report a zero box; use estimates instead.
  if (!node.isConnected) return null;

  try {
    const box = node.getBBox();

    if (!Number.isFinite(box.width) || !Number.isFinite(box.height)) return null;

    // Connected elements inside a `display: none` subtree have no layout, so browsers report an
    // all-zero box. Treat that as unmeasurable and let callers fall back to the deterministic
    // estimates instead of collapsing every node to its text margin.
    if (box.width === 0 && box.height === 0) return null;

    return { x: box.x, y: box.y, width: box.width, height: box.height };
  } catch {
    return null;
  }
};
