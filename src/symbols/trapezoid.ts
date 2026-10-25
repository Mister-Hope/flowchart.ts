import type FlowChart from "../chart.js";
import type { SymbolOptions } from "../options.js";
import type { Position } from "../typings.js";
import { FlowChartSymbol } from "./symbol.js";

/**
 * Shared base for the trapezoid-shaped node types (`input`, `inputoutput`, `output`).
 *
 * The text is indented by three text margins and connections attach at the flat edges rather than
 * at the slanted corners.
 */
export abstract class TrapezoidSymbol extends FlowChartSymbol {
  protected readonly textMargin: number;

  constructor(chart: FlowChart, options: SymbolOptions) {
    super(chart, options);

    this.textMargin = this.getAttr("text-margin");

    this.text.setAttr("x", this.textMargin * 3);
  }

  override getLeft(): Position {
    return {
      x: this.getX() + this.textMargin,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }

  override getRight(): Position {
    return {
      x: this.getX() + this.group.getBBox().width - this.textMargin,
      y: this.getY() + this.group.getBBox().height / 2,
    };
  }
}
