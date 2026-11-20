// Keep source positions intact so the parser can split the original text at
// real operators. Scan each literal once, including an unterminated one.
export const maskConditionStrings = (expression) => {
  const delimiters = /["']/g;
  let start = 0;
  let masked = "";
  let match;
  while ((match = delimiters.exec(expression))) {
    const quote = match[0];
    let end = match.index + 1;
    while (end < expression.length && expression[end] !== quote) {
      if (quote === '"' && expression[end] === "\\") end++;
      end++;
    }
    if (end >= expression.length) break;
    masked +=
      expression.slice(start, match.index) + "_".repeat(end + 1 - match.index);
    start = end + 1;
    delimiters.lastIndex = start;
  }
  return start === 0 ? expression : masked + expression.slice(start);
};
