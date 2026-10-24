import type { SymbolOptions, SymbolType } from "../options.js";
import type { Chart } from "./types.js";

// Returns the text between the first `(` and the last `)` of a DSL fragment.
const getParenthesizedText = (line: string): string => {
  const startIndex = line.indexOf("(") + 1;
  const endIndex = line.indexOf(")");

  if (startIndex > 0 && endIndex > 0) return line.slice(startIndex, endIndex);

  return "";
};

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
 * Extracts the branch/direction specifier of a flow fragment, e.g. `yes, right`.
 *
 * @param line DSL fragment such as `cond(yes, right)`.
 * @returns The specifier text, or an empty string when there is none.
 */
export const getSymbolValue = (line: string): string => getParenthesizedText(line);

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

  const tempSplit = temp.split("@");

  return tempSplit.length > 1 ? (startIndex > 0 && endIndex > 0 ? (tempSplit[1] ?? "") : "") : "";
};

const SYMBOL_TYPES = new Set<string>([
  "start",
  "end",
  "operation",
  "inputoutput",
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
  if (!rawType.includes(": ")) return { rawType, text: null };

  const parts = rawType.split(": ");

  return { rawType: parts.shift() ?? "", text: parts.join(": ") };
};

interface CallbackOrLinkParts extends DefinitionParts {
  link: string | null;
  functionName: string | null;
}

// Splits `:$callback` or `:>link` suffixes from the type or text.
const splitCallbackOrLink = (rawType: string, text: string | null): CallbackOrLinkParts => {
  if (text != null && text.includes(":$")) {
    const parts = text.split(":$");

    return { rawType, text: parts.shift() ?? null, link: null, functionName: parts.join(":$") };
  }

  if (rawType.includes(":$")) {
    const parts = rawType.split(":$");

    return { rawType: parts.shift() ?? "", text, link: null, functionName: parts.join(":$") };
  }

  if (text != null && text.includes(":>")) {
    const parts = text.split(":>");

    return { rawType, text: parts.shift() ?? null, link: parts.join(":>"), functionName: null };
  }

  if (rawType.includes(":>")) {
    const parts = rawType.split(":>");

    return { rawType: parts.shift() ?? "", text, link: parts.join(":>"), functionName: null };
  }

  return { rawType, text, link: null, functionName: null };
};

// Extracts `[blank]`-style target hints from a link.
const splitTarget = (link: string | null): { link: string | null; target: string | null } => {
  if (link == null) return { link, target: null };

  const startIndex = link.indexOf("[") + 1;
  const endIndex = link.indexOf("]");

  if (startIndex > 0 && endIndex > 0)
    return { link: link.slice(0, startIndex - 1), target: link.slice(startIndex, endIndex) };

  return { link, target: null };
};

// Splits the trailing `|flowstate` hint from the display text.
const splitFlowstate = (text: string | null): { text: string | null; flowstate: string | null } => {
  if (text == null || !text.includes("|")) return { text, flowstate: null };

  const parts = text.split("|");
  const flowstate = parts.pop()?.trim() ?? null;

  return { text: parts.join("|"), flowstate };
};

/**
 * Parses a DSL definition line such as `cond=>condition: Ready?`.
 *
 * @param line Definition line.
 * @returns The symbol definition.
 */
export const parseDefinition = (line: string): SymbolOptions => {
  const parts = line.split("=>");
  const left = parts[0] ?? "";
  const key = left.replace(/\(.*\)/u, "");
  const params = parseParams(left);

  const { rawType, text } = splitText(parts[1] ?? "");
  const { rawType: type, text: label, link, functionName } = splitCallbackOrLink(rawType, text);
  const flowType = type.includes("\n") ? (type.split("\n")[0] ?? "") : type;
  const { link: plainLink, target } = splitTarget(link);
  const { text: plainText, flowstate } = splitFlowstate(label);

  if (!isSymbolType(flowType))
    throw new Error(`Unknown symbol type "${flowType}" for node "${key}"!`);

  return {
    key,
    symbolType: flowType,
    text: plainText,
    link: plainLink,
    target,
    function: functionName,
    flowstate,
    lineStyle: {},
    params,
  };
};
