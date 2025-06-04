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
  const matches = [...str.matchAll(VARIABLE_REGEX)];

  if (matches.length === 0) {
    // No variables, return literal
    return {
      type: NodeType.LITERAL,
      value: str,
    };
  }

  if (matches.length === 1 && matches[0][0] === str) {
    // Single variable that is the entire string
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
      parts.push(str.substring(lastIndex, index));
    }

    // Add variable reference
    parts.push({ var: varName.trim() });

    lastIndex = index + fullMatch.length;
  }

  // Add remaining literal part
  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return {
    type: NodeType.INTERPOLATION,
    parts,
  };
};
