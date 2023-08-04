function prompt_a111_to_compel(input: string) {
  // Check if already compel
  if (input.match(/\b[+-]+/)) return input;
  if (input.match(/\)\.\w+\(/)) return input;

  let output = input.replace(
    /([(\[]{1,6})([^():]+?)([)\]]{1,6})/g,
    (match, p1, p2, p3, _offset, _string, _groups) => {
      if (p1.length !== p3.length) return match;
      const char = p1[0] === "(" ? "+" : "-";
      const phrase = p2.match(/ /) ? "(" + p2 + ")" : p2;
      return phrase + char.repeat(p1.length);
    }
  );

  output = output.replace(
    /\(([^)]+):([0-9\.]+)\)/g,
    (match, p1, p2, _offset, _string, _groups) => {
      return "(" + p1 + ")" + p2;
    }
  );

  output = output.replace(
    /<lora:(?<lora>[^:]+):(?<scale>[0-9.]+)>/g,
    (match, p1, p2, _offset, _string, groups) => {
      return `withLora(${groups.lora},${groups.scale})`;
    }
  );

  return output;
}

export { prompt_a111_to_compel };
