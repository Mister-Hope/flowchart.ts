import { Renderable, toNumber } from "./element.js";
import type { BBox } from "./types.js";

/** A rectangle, optionally rounded (`r`). */
export class RectElement extends Renderable {
  constructor(node: SVGRectElement, radius = 0) {
    super(node);

    if (radius > 0) {
      this.setAttribute("rx", radius);
      this.setAttribute("ry", radius);
    }
  }

  override getBBox(): BBox {
    return {
      x: toNumber(this.attributes.x),
      y: toNumber(this.attributes.y),
      width: toNumber(this.attributes.width),
      height: toNumber(this.attributes.height),
    };
  }
}
