import type { SymbolOptions, SymbolType } from "../options.js";
import { validateLink, validateTarget } from "../security.js";
import type { Chart } from "./types.js";

/**
 * Extracts the JSON object of a line style, e.g. `{"stroke":"red"}`.
 *
 * @param line DSL fragment such as `a({"stroke":"red"})`.
 * @returns The JSON text, or `{}` when the line has no parentheses.
 */
export const getStyle = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");

  if (startIndex > 0 && endIndex > 0) return line.slice(startIndex, endIndex);

  return "{}";
};

/**
 * Looks up a symbol by the key used in a flow line.
 *
 * @param line Flow fragment, optionally with a branch specifier.
 * @param chart Parsed chart.
 * @returns The symbol definition, if defined.
 */
export const getSymbol = (line: string, chart: Chart): SymbolOptions | undefined => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");

  if (startIndex > 0 && endIndex > 0) return chart.symbols[line.slice(0, startIndex - 1)];

  return chart.symbols[line];
};

/**
 * Looks up a symbol by the key used in a flow line and fails when it is undefined.
 *
 * @param line Flow fragment, optionally with a branch specifier.
 * @param chart Parsed chart.
 * @returns The symbol definition.
 */
export const requireSymbol = (line: string, chart: Chart): SymbolOptions => {
  const symbol = getSymbol(line, chart);

  if (symbol == null) throw new Error(`Unknown symbol "${line}" in flowchart definition.`);

  return symbol;
};

/**
 * Extracts the annotation of a flow fragment, e.g. `ok` from `cond(yes@ok)`.
 *
 * @param line Flow fragment.
 * @returns The annotation, or an empty string when there is none.
 */
export const getAnnotation = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");
  let temp = line.slice(startIndex, endIndex);

  if (temp.indexOf(",") > 0) temp = temp.slice(0, temp.indexOf(","));

  const annotationIndex = temp.indexOf("@");

  if (startIndex <= 0 || endIndex <= 0 || annotationIndex <= 0) return "";

  return temp.slice(annotationIndex + 1);
};

const SYMBOL_TYPES = new Set<string>([
  "start",
  "end",
  "operation",
  "inputoutput",
  "input",
  "output",
  "subroutine",
  "condition",
  "parallel",
]);

const isSymbolType = (value: string): value is SymbolType => SYMBOL_TYPES.has(value);

// Parses the left-hand side params of a definition, e.g. `cond(a=1, b=2)`.
const parseParams = (source: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const paramsText = /\((?<params>.*)\)/u.exec(source)?.groups?.params;

  if (paramsText == null) return params;

  for (const entry of paramsText.split(",")) {
    const entryParts = entry.split("=");
    const [paramKey, paramValue] = entryParts;

    if (entryParts.length === 2 && paramKey != null && paramValue != null)
      params[paramKey.trim()] = paramValue.trim();
  }

  return params;
};

interface DefinitionParts {
  rawType: string;
  text: string | null;
}

// Splits the type from the display text: `operation: My Op` -> `operation` + `My Op`.
const splitText = (rawType: string): DefinitionParts => {
  const index = rawType.indexOf(": ");

  if (index === -1) return { rawType, text: null };

  return { rawType: rawType.slice(0, index), text: rawType.slice(index + 2) };
};

interface CallbackOrLinkParts extends DefinitionParts {
  link: string | null;
  functionName: string | null;
}

// Splits `:$callback` or `:>link` suffixes from the type or text.
const splitCallbackOrLink = (rawType: string, text: string | null): CallbackOrLinkParts => {
  if (text != null) {
    const callbackIndex = text.indexOf(":$");

    if (callbackIndex !== -1) {
      return {
        rawType,
        text: text.slice(0, callbackIndex),
        link: null,
        functionName: text.slice(callbackIndex + 2),
      };
    }

    const linkIndex = text.indexOf(":>");

    if (linkIndex !== -1) {
      return {
        rawType,
        text: text.slice(0, linkIndex),
        link: text.slice(linkIndex + 2),
        functionName: null,
      };
    }
  }

  const callbackIndex = rawType.indexOf(":$");

  if (callbackIndex !== -1) {
    return {
      rawType: rawType.slice(0, callbackIndex),
      text,
      link: null,
      functionName: rawType.slice(callbackIndex + 2),
    };
  }

  const linkIndex = rawType.indexOf(":>");

  if (linkIndex !== -1) {
    return {
      rawType: rawType.slice(0, linkIndex),
      text,
      link: rawType.slice(linkIndex + 2),
      functionName: null,
    };
  }

  return { rawType, text, link: null, functionName: null };
};

// Extracts a trailing `[blank]`-style target hint from a link.
const TARGET_SUFFIX_PATTERN = /\[(?<target>[^\]]+)\]$/u;

const splitTarget = (link: string | null): { link: string | null; target: string | null } => {
  if (link == null) return { link, target: null };

  const match = TARGET_SUFFIX_PATTERN.exec(link);
  const target = match?.groups?.target;

  if (match != null && target != null) return { link: link.slice(0, match.index), target };

  return { link, target: null };
};

// Splits the trailing `|flowstate` hint from the display text.
const splitFlowstate = (text: string | null): { text: string | null; flowstate: string | null } => {
  if (text == null || !text.includes("|")) return { text, flowstate: null };

  const separator = text.lastIndexOf("|");
  const flowstate = text.slice(separator + 1).trim();

  return {
    text: text.slice(0, separator),
    flowstate: flowstate === "" ? null : flowstate,
  };
};

/**
 * Parses a DSL definition line such as `cond=>condition: Ready?`.
 *
 * @param line Definition line.
 * @returns The symbol definition.
 */
export const parseDefinition = (line: string): SymbolOptions => {
  const separator = line.indexOf("=>");
  const left = line.slice(0, Math.max(0, separator));
  const key = left.replace(/\(.*\)/u, "");
  const params = parseParams(left);

  const { rawType, text } = splitText(line.slice(separator + 2));
  const { rawType: type, text: label, link, functionName } = splitCallbackOrLink(rawType, text);
  const flowType = type.split("\n", 1).join("");
  const { link: rawLink, target: rawTarget } = splitTarget(link);
  const safeLink = rawLink == null ? null : validateLink(rawLink, key);
  const safeTarget = rawTarget == null ? null : validateTarget(rawTarget, key);
  const { text: plainText, flowstate } = splitFlowstate(label);

  if (!isSymbolType(flowType))
    throw new Error(`Unknown symbol type "${flowType}" for node "${key}"!`);

  return {
    key,
    symbolType: flowType,
    text: plainText,
    link: safeLink,
    target: safeTarget,
    function: functionName,
    flowstate,
    lineStyle: {},
    params,
  };
};
