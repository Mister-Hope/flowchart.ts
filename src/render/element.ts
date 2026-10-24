import type { AttributeValue, BBox } from "./types.js";
import { SVG_NAMESPACE } from "./types.js";

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

/**
 * Base wrapper around a single SVG node.
 *
 * It reproduces the small part of the raphael element API the chart layout relies on: `attr()`,
 * `node`, `getBBox()`, `insertBefore()` and links (`href`/`target`).
 */
export abstract class Renderable {
  protected readonly attributes: Record<string, AttributeValue> = {};

  /** Set when the element is wrapped in an `<a>` element for links. */
  protected linkWrapper: SVGAElement | null = null;

  constructor(public readonly node: SVGElement) {}

  /** Top-level DOM node: the link wrapper when linked, the shape itself otherwise. */
  get domNode(): SVGElement {
    return this.linkWrapper ?? this.node;
  }

  attr(name: string): AttributeValue | undefined;
  attr(attributes: Record<string, AttributeValue>): this;
  attr(name: string, value: AttributeValue): this;
  attr(
    nameOrAttributes: string | Record<string, AttributeValue>,
    value?: AttributeValue,
  ): this | AttributeValue | undefined {
    if (typeof nameOrAttributes === "string") {
      if (value == null) return this.attributes[nameOrAttributes];

      this.setAttribute(nameOrAttributes, value);

      return this;
    }

    for (const [name, attributeValue] of Object.entries(nameOrAttributes))
      this.setAttribute(name, attributeValue);

    return this;
  }

  abstract getBBox(): BBox;

  insertBefore(element: Renderable): void {
    element.domNode.before(this.domNode);
  }

  remove(): void {
    this.domNode.remove();
  }

  protected setAttribute(name: string, value: AttributeValue): void {
    this.attributes[name] = value;

    switch (name) {
      case "href": {
        this.applyLink(String(value), this.linkTarget());
        break;
      }
      case "target": {
        this.applyLinkTarget(String(value));
        break;
      }
      case "cursor": {
        this.node.style.cursor = String(value);
        break;
      }
      default: {
        this.node.setAttribute(name, String(value));
        break;
      }
    }
  }

  /**
   * Current `target` attribute, used when `href` is applied after `target`.
   *
   * @returns The target attribute value, or `null` when it is not set.
   */
  protected linkTarget(): string | null {
    const { target } = this.attributes;

    return typeof target === "string" ? target : null;
  }

  /**
   * Wrap the element in an `<a>` element so links keep working in SVG.
   *
   * @param href Link target.
   * @param target Optional link target attribute (`_blank`, ...).
   */
  protected applyLink(href: string, target?: string | null): void {
    if (this.linkWrapper == null) {
      const document = this.node.ownerDocument;
      const anchor = document.createElementNS(SVG_NAMESPACE, "a");
      const parent = this.node.parentNode;

      if (parent == null) return;

      this.node.before(anchor);
      anchor.append(this.node);
      this.linkWrapper = anchor;
    }

    this.linkWrapper.setAttribute("href", href);

    if (target != null) this.applyLinkTarget(target);
  }

  protected applyLinkTarget(target: string): void {
    if (this.linkWrapper == null) return;

    // The DSL uses `[blank]`, which raphael mapped to `xlink:show="new"`; map it to `_blank`.
    const resolvedTarget = target === "blank" ? "_blank" : target;

    this.linkWrapper.setAttribute("target", resolvedTarget);

    if (resolvedTarget === "_blank") this.linkWrapper.setAttribute("rel", "noopener noreferrer");
  }
}
