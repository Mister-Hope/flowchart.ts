import type { SymbolOptions } from "../options.js";
import type { Renderable } from "../render/index.js";

/**
 * Binds the `options.function` click callback to a rendered element.
 *
 * @param element Element that should react to clicks.
 * @param options Parsed symbol options containing the callback name.
 */
const bindClick = (element: Renderable, options: Partial<SymbolOptions>): void => {
  const { function: functionName } = options;

  if (functionName == null) return;

  element.node.addEventListener(
    "click",
    (event) => {
      const handler = (
        globalThis as unknown as Record<
          string,
          ((event: Event, options: Partial<SymbolOptions>) => void) | undefined
        >
      )[functionName];

      handler?.(event, options);
    },
    false,
  );
};

/**
 * Applies the configured link and target to a rendered element.
 *
 * @param element Element receiving the link.
 * @param options Symbol options parsed from the flowchart.
 */
export const applyNodeLink = (element: Renderable, options: Partial<SymbolOptions>): void => {
  if (options.link != null) element.setAttr("href", options.link);
  if (options.target != null) element.setAttr("target", options.target);
};

/**
 * Binds the configured click callback and pointer cursor to a rendered element.
 *
 * @param element Element receiving the callback.
 * @param options Symbol options parsed from the flowchart.
 */
export const applyNodeCallback = (element: Renderable, options: Partial<SymbolOptions>): void => {
  if (options.function == null) return;

  bindClick(element, options);
  element.setAttr("cursor", "pointer");
};
