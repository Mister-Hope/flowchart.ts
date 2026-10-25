import { toNumber } from "../utils.js";
import { Renderable } from "./element.js";
import {
  estimateTextHeight,
  estimateTextWidth,
  measureNativeBBox,
  textLineHeight,
} from "./text-metrics.js";
import type { AttributeValue, BBox } from "./types.js";
import { SVG_NAMESPACE } from "./types.js";

const DEFAULT_FONT_FAMILY = "Arial";
const DEFAULT_FONT_SIZE = 10;

/** Multi-line text element. `y` is the vertical centre of the text block (same as raphael). */
export class TextElement extends Renderable {
  private lines: string[] = [];

  private firstLineShift = 0;

  constructor(node: SVGTextElement, x: number, y: number, text: string) {
    super(node);

    this.attributes["font-family"] = DEFAULT_FONT_FAMILY;
    this.attributes["font-size"] = DEFAULT_FONT_SIZE;
    this.attributes["text-anchor"] = "start";
    this.attributes.fill = "#000000";
    this.attributes.x = x;
    this.attributes.y = y;
    this.attributes.text = text;

    this.node.setAttribute("font-family", DEFAULT_FONT_FAMILY);
    this.node.setAttribute("font-size", `${DEFAULT_FONT_SIZE}px`);
    this.node.setAttribute("fill", "#000000");
    this.updateText();
  }

  override getBBox(): BBox {
    const nativeBox = measureNativeBBox(this.node as unknown as SVGGraphicsElement);

    if (nativeBox != null) return nativeBox;

    const fontSize = this.fontSize();
    const width = Math.max(...this.lines.map((line) => estimateTextWidth(line, fontSize)), 0);

    if (width === 0) return { x: this.anchorX(), y: 0, width: 0, height: 0 };

    const height = estimateTextHeight(this.lines.length, fontSize);
    const baseline = toNumber(this.attributes.y) + this.firstLineShift;

    return {
      x: this.anchorX(width),
      y: baseline - fontSize * 0.8,
      width,
      height,
    };
  }

  protected override applyAttr(name: string, value: AttributeValue): void {
    switch (name) {
      case "text":
      case "x":
      case "y": {
        this.updateText();
        break;
      }
      case "font-size": {
        this.node.setAttribute("font-size", `${toNumber(value, DEFAULT_FONT_SIZE)}px`);
        this.updateText();
        break;
      }
      case "text-anchor": {
        this.node.setAttribute("text-anchor", String(value));
        this.updateText();
        break;
      }
      case "font": {
        this.node.style.font = String(value);
        break;
      }
      case "fill":
      case "stroke":
      case "stroke-width":
      case "font-family":
      case "font-style":
      case "font-weight":
      case "letter-spacing": {
        this.node.setAttribute(name, String(value));
        break;
      }
      default: {
        super.applyAttr(name, value);
        break;
      }
    }
  }

  private fontSize(): number {
    return toNumber(this.attributes["font-size"], DEFAULT_FONT_SIZE);
  }

  private anchorX(width = 0): number {
    const x = toNumber(this.attributes.x);

    switch (this.attributes["text-anchor"]) {
      case "middle": {
        return x - width / 2;
      }
      case "end": {
        return x - width;
      }
      default: {
        return x;
      }
    }
  }

  private updateText(): void {
    const text = typeof this.attributes.text === "string" ? this.attributes.text : "";

    this.lines = text.split("\n");

    const fontSize = this.fontSize();
    const lineHeight = textLineHeight(fontSize);
    const x = toNumber(this.attributes.x);
    const y = toNumber(this.attributes.y);

    while (this.node.firstChild != null) this.node.firstChild.remove();

    for (const [index, line] of this.lines.entries()) {
      const tspan = this.node.ownerDocument.createElementNS(SVG_NAMESPACE, "tspan");

      if (index > 0) {
        tspan.setAttribute("dy", String(lineHeight));
        tspan.setAttribute("x", String(x));
      }

      tspan.textContent = line;
      this.node.append(tspan);
    }

    this.node.setAttribute("x", String(x));
    this.node.setAttribute("y", String(y));

    this.firstLineShift = this.computeFirstLineShift(fontSize, lineHeight, y);

    this.node.firstElementChild?.setAttribute("dy", String(this.firstLineShift));
  }

  /**
   * Reproduces raphael's vertical centring: measure the text block, then shift the first line so
   * the block centre sits on the requested `y`.
   *
   * @param fontSize Font size in pixels.
   * @param lineHeight Distance between two lines in pixels.
   * @param y Requested vertical centre of the text block.
   * @returns Vertical offset applied to the first line.
   */
  private computeFirstLineShift(fontSize: number, lineHeight: number, y: number): number {
    const nativeBox = measureNativeBBox(this.node as unknown as SVGGraphicsElement);

    if (nativeBox != null) return y - (nativeBox.y + nativeBox.height / 2);

    // Empty text has no ink, so the browser reports a box at y = 0; mirror that.
    if (this.lines.every((line) => line === "")) return y;

    return fontSize * 0.3 - ((this.lines.length - 1) * lineHeight) / 2;
  }
}
