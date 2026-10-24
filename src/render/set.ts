import type { Renderable } from "./element.js";
import type { BBox } from "./types.js";
import { SVG_NAMESPACE } from "./types.js";

const TRANSLATE_REGEXP = /(?<x>-?[\d.]+)[,\s]+(?<y>-?[\d.]+)/u;

/**
 * A `<g>` element standing in for a raphael set: children are grouped and translated together, and
 * the bounding box is the union of the children boxes.
 */
export class SetElement {
  readonly node: SVGGElement;

  private readonly items: Renderable[] = [];

  private translateX = 0;

  private translateY = 0;

  constructor(document: Document) {
    this.node = document.createElementNS(SVG_NAMESPACE, "g");
  }

  push(...elements: Renderable[]): this {
    for (const element of elements) {
      if (this.items.includes(element)) continue;

      this.items.push(element);
      this.node.append(element.domNode);
    }

    return this;
  }

  /**
   * Only translation is used by the chart layout (`t<x>,<y>`, including raphael's `$t` typo).
   *
   * @param transformString SVG transform string produced by the chart layout.
   * @returns This set, for chaining.
   */
  transform(transformString: string): this {
    const match = TRANSLATE_REGEXP.exec(transformString.replaceAll("$", ""));

    if (match == null) return this;

    this.translateX = Number(match.groups?.x);
    this.translateY = Number(match.groups?.y);
    this.node.setAttribute("transform", `translate(${this.translateX},${this.translateY})`);

    return this;
  }

  getBBox(): BBox {
    if (this.items.length === 0)
      return { x: this.translateX, y: this.translateY, width: 0, height: 0 };

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const item of this.items) {
      const box = item.getBBox();

      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }

    return {
      x: minX + this.translateX,
      y: minY + this.translateY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}
