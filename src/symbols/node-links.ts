import type FlowChart from "../chart.js";
import type { ClickCallback, SymbolOptions } from "../options.js";
import type { Renderable } from "../render/index.js";
import { toSafeLink, toSafeTarget } from "../security.js";

const CALLBACK_NAME_PATTERN = /^[A-Za-z_$][\w$]*$/u;

/**
 * Resolves a click handler from the explicit `callbacks` option first, then from `globalThis`.
 *
 * Only functions are returned; the global fallback is limited to identifier-like names so a DSL
 * author cannot reach arbitrary properties.
 *
 * @param chart Chart providing the `callbacks` option.
 * @param functionName Callback name from the DSL.
 * @returns The click handler, or `null` when it does not resolve to a function.
 */
const resolveClickHandler = (chart: FlowChart, functionName: string): ClickCallback | null => {
  const registered = chart.options.callbacks?.[functionName];

  if (typeof registered === "function") return registered;

  if (!CALLBACK_NAME_PATTERN.test(functionName)) return null;

  const globalHandler = (globalThis as Record<string, unknown>)[functionName];

  return typeof globalHandler === "function" ? (globalHandler as ClickCallback) : null;
};

/**
 * Binds the `options.function` click callback to a rendered element.
 *
 * @param chart Chart providing the `callbacks` option.
 * @param element Element that should react to clicks.
 * @param options Parsed symbol options containing the callback name.
 * @returns Whether a click handler was bound.
 */
const bindClick = (
  chart: FlowChart,
  element: Renderable,
  options: Partial<SymbolOptions>,
): boolean => {
  const { function: functionName } = options;

  if (functionName == null) return false;

  const handler = resolveClickHandler(chart, functionName);

  if (handler == null) return false;

  element.node.addEventListener(
    "click",
    (event) => {
      handler(event, options);
    },
    false,
  );

  return true;
};

/**
 * Applies the configured link and target to a rendered element.
 *
 * Unsafe links are dropped at render time as a second line of defense (the parser already validates
 * DSL input).
 *
 * @param element Element receiving the link.
 * @param options Symbol options parsed from the flowchart.
 */
export const applyNodeLink = (element: Renderable, options: Partial<SymbolOptions>): void => {
  const link = options.link == null ? null : toSafeLink(options.link);

  if (link == null) return;

  element.setAttr("href", link);

  if (options.target != null) {
    const target = toSafeTarget(options.target);

    if (target != null) element.setAttr("target", target);
  }
};

/**
 * Binds the configured click callback and pointer cursor to a rendered element.
 *
 * @param chart Chart providing the `callbacks` option.
 * @param element Element receiving the callback.
 * @param options Symbol options parsed from the flowchart.
 */
export const applyNodeCallback = (
  chart: FlowChart,
  element: Renderable,
  options: Partial<SymbolOptions>,
): void => {
  if (options.function == null) return;

  if (bindClick(chart, element, options)) element.setAttr("cursor", "pointer");
};
