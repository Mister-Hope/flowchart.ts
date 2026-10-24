import { toSafeLink, toSafeTarget } from "../security.js";
import type { AttributeValue, BBox } from "./types.js";
import { SVG_NAMESPACE } from "./types.js";

/**
 * Base wrapper around a single SVG node.
 *
 * It reproduces the small part of the raphael element API the chart layout relies on: attributes,
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

  /**
   * Reads back an attribute value that was set through {@link setAttr}.
   *
   * @param name Attribute name.
   * @returns The stored value, or `undefined` when it was never set.
   */
  getAttr(name: string): AttributeValue | undefined {
    return this.attributes[name];
  }

  /**
   * Sets a single attribute.
   *
   * @param name Attribute name.
   * @param value Attribute value.
   * @returns This element, for chaining.
   */
  setAttr(name: string, value: AttributeValue): this {
    this.attributes[name] = value;
    this.applyAttr(name, value);

    return this;
  }

  /**
   * Sets multiple attributes at once. Prefer {@link setAttr} for a single attribute.
   *
   * @param attributes Attribute name/value pairs.
   * @returns This element, for chaining.
   */
  setAttrs(attributes: Record<string, AttributeValue>): this {
    for (const [name, value] of Object.entries(attributes)) this.setAttr(name, value);

    return this;
  }

  abstract getBBox(): BBox;

  insertBefore(element: Renderable): void {
    element.domNode.before(this.domNode);
  }

  remove(): void {
    this.domNode.remove();
  }

  /**
   * Applies one attribute to the DOM. Subclasses override this for attributes that need special
   * handling (text layout, paths, markers, ...).
   *
   * @param name Attribute name.
   * @param value Attribute value.
   */
  protected applyAttr(name: string, value: AttributeValue): void {
    const normalizedName = name.toLowerCase();

    // Defense in depth: never write inline event handlers, inline CSS or raw xlink links, no matter
    // which code path tries to set them.
    if (
      normalizedName.startsWith("on") ||
      normalizedName === "style" ||
      normalizedName === "xlink:href"
    )
      return;

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
    const safeHref = toSafeLink(href);

    if (safeHref == null) return;

    if (this.linkWrapper == null) {
      const { ownerDocument } = this.node;
      const anchor = ownerDocument.createElementNS(SVG_NAMESPACE, "a");
      const parent = this.node.parentNode;

      if (parent == null) return;

      this.node.before(anchor);
      anchor.append(this.node);
      this.linkWrapper = anchor;
    }

    this.linkWrapper.setAttribute("href", safeHref);

    if (target != null) this.applyLinkTarget(target);
  }

  protected applyLinkTarget(target: string): void {
    const safeTarget = toSafeTarget(target);

    if (safeTarget == null || this.linkWrapper == null) return;

    // The DSL uses `[blank]`, which raphael mapped to `xlink:show="new"`; map it to `_blank`.
    const resolvedTarget = safeTarget === "blank" ? "_blank" : safeTarget;

    this.linkWrapper.setAttribute("target", resolvedTarget);

    if (resolvedTarget === "_blank") this.linkWrapper.setAttribute("rel", "noopener noreferrer");
    else this.linkWrapper.removeAttribute("rel");
  }
}
