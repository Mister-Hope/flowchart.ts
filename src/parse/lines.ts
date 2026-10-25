/**
 * Splits DSL input into logical lines. CRLF and lone CR are normalized to `\n` first, a trailing
 * backslash keeps the following newline inside the line, and continuation lines without `->`, `=>`
 * or `@>` are merged into the previous line.
 *
 * @param input Raw DSL input.
 * @returns Trimmed DSL lines in definition order.
 */
export const getLines = (input: string): string[] => {
  const lines: string[] = [];
  const source = input.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  let prevBreak = 0;

  for (let index = 1; index < source.length; index += 1) {
    if (source[index] === "\n" && source[index - 1] !== "\\") {
      const line = source.slice(prevBreak, index);

      prevBreak = index + 1;
      lines.push(line.replaceAll("\\\n", "\n"));
    }
  }

  if (prevBreak < source.length) lines.push(source.slice(prevBreak));

  const merged: string[] = [];
  let current: string | null = null;

  for (const line of lines) {
    if (current != null && !line.includes("->") && !line.includes("=>") && !line.includes("@>")) {
      current += `\n${line}`;
    } else {
      if (current != null) merged.push(current);
      current = line;
    }
  }

  if (current != null) merged.push(current);

  return merged;
};
