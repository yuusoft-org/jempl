import { NodeType } from "./constants.js";

const VARIABLE_REGEX = /\$\{([^}]*)\}/g;

/**
 * Parses a variable expression like ${name} or ${user.profile.name}
 * @param {string} expr - The expression without ${ and }
 * @returns {Object} Variable node
 */
export const parseVariable = (expr) => {
  return {
    type: NodeType.VARIABLE,
    path: expr.trim(),
  };
};

/**
 * Parses a string value that may contain interpolations
 * @param {string} str - The string to parse
 * @returns {Object} Variable, interpolation, or literal node
 */
export const parseStringValue = (str) => {
  // Handle escaping: first handle double escapes, then single escapes
  let processedStr = str;
  const escapedParts = [];

  // Handle escaped sequences - need to process double escapes carefully
  if (str.includes("\\${")) {
    // First replace \\${ (double escape) with a special marker to preserve it
    processedStr = str.replace(/\\\\(\$\{[^}]*\})/g, "\\DOUBLE_ESC$1");

    // Then replace \${ (single escape) with placeholder
    processedStr = processedStr.replace(
      /\\(\$\{[^}]*\})/g,
      (match, dollarExpr) => {
        const placeholder = `__ESCAPED_${escapedParts.length}__`;
        escapedParts.push(dollarExpr);
        return placeholder;
      },
    );

    // Restore double escapes as literal backslash + variable
    processedStr = processedStr.replace(/\\DOUBLE_ESC/g, "\\");
  }

  const matches = [...processedStr.matchAll(VARIABLE_REGEX)];

  if (matches.length === 0) {
    // No variables, return literal (restore escapes)
    let finalValue = processedStr;
    for (let i = 0; i < escapedParts.length; i++) {
      finalValue = finalValue.replace(`__ESCAPED_${i}__`, escapedParts[i]);
    }
    return {
      type: NodeType.LITERAL,
      value: finalValue,
    };
  }

  if (
    matches.length === 1 &&
    matches[0][0] === processedStr &&
    escapedParts.length === 0
  ) {
    // Single variable that is the entire string, no escapes
    return parseVariable(matches[0][1]);
  }

  // Multiple variables or mixed content - create interpolation
  const parts = [];
  let lastIndex = 0;

  for (const match of matches) {
    const [fullMatch, varName] = match;
    const index = match.index;

    // Add literal part before the variable
    if (index > lastIndex) {
      let literalPart = processedStr.substring(lastIndex, index);
      // Restore escaped parts in this literal section
      for (let i = 0; i < escapedParts.length; i++) {
        literalPart = literalPart.replace(`__ESCAPED_${i}__`, escapedParts[i]);
      }
      if (literalPart) {
        parts.push(literalPart);
      }
    }

    // Add variable reference
    parts.push({ var: varName.trim() });

    lastIndex = index + fullMatch.length;
  }

  // Add remaining literal part
  if (lastIndex < processedStr.length) {
    let literalPart = processedStr.substring(lastIndex);
    // Restore escaped parts in this literal section
    for (let i = 0; i < escapedParts.length; i++) {
      literalPart = literalPart.replace(`__ESCAPED_${i}__`, escapedParts[i]);
    }
    if (literalPart) {
      parts.push(literalPart);
    }
  }

  return {
    type: NodeType.INTERPOLATION,
    parts,
  };
};
