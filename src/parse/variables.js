import { NodeType } from "./constants.js";

const VARIABLE_REGEX = /\$\{([^}]*)\}/g;

/**
 * Parses a function call expression like functionName(arg1, arg2)
 * @param {string} expr - The expression without ${ and }
 * @returns {Object|null} Function node or null if not a function call
 */
const parseFunctionCall = (expr) => {
  const functionMatch = expr.match(/^(\w+)\((.*)\)$/);
  if (!functionMatch) return null;

  const [, name, argsStr] = functionMatch;
  const args = parseArguments(argsStr);

  return {
    type: NodeType.FUNCTION,
    name,
    args,
  };
};

/**
 * Parses function arguments from a string
 * @param {string} argsStr - The arguments string
 * @returns {Array} Array of parsed argument nodes
 */
const parseArguments = (argsStr) => {
  if (!argsStr.trim()) return [];

  const args = splitArguments(argsStr);
  return args.map((arg) => parseArgument(arg.trim()));
};

/**
 * Splits argument string respecting quotes and nested parentheses
 * @param {string} argsStr - The arguments string
 * @returns {Array<string>} Array of argument strings
 */
const splitArguments = (argsStr) => {
  const args = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    const prevChar = i > 0 ? argsStr[i - 1] : "";

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar && prevChar !== "\\") {
      inQuotes = false;
      quoteChar = "";
      current += char;
    } else if (!inQuotes && char === "(") {
      depth++;
      current += char;
    } else if (!inQuotes && char === ")") {
      depth--;
      current += char;
    } else if (!inQuotes && char === "," && depth === 0) {
      args.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
};

/**
 * Parses a single argument
 * @param {string} arg - The argument string
 * @returns {Object} Parsed argument node
 */
const parseArgument = (arg) => {
  // Handle string literals
  if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
    return { type: NodeType.LITERAL, value: arg.slice(1, -1) };
  }

  // Handle numeric literals
  if (/^-?\d+(\.\d+)?$/.test(arg)) {
    return { type: NodeType.LITERAL, value: parseFloat(arg) };
  }

  // Handle boolean literals
  if (arg === "true") {
    return { type: NodeType.LITERAL, value: true };
  }
  if (arg === "false") {
    return { type: NodeType.LITERAL, value: false };
  }

  // Handle null
  if (arg === "null") {
    return { type: NodeType.LITERAL, value: null };
  }

  // Handle nested function calls
  const nestedFunction = parseFunctionCall(arg);
  if (nestedFunction) {
    return nestedFunction;
  }

  // Default to variable reference
  return { type: NodeType.VARIABLE, path: arg };
};

/**
 * Parses a variable expression like ${name} or ${user.profile.name} or function calls like ${now()}
 * @param {string} expr - The expression without ${ and }
 * @returns {Object} Variable or Function node
 */
export const parseVariable = (expr) => {
  const trimmed = expr.trim();

  // Try to parse as function call first
  const functionNode = parseFunctionCall(trimmed);
  if (functionNode) {
    return functionNode;
  }

  // Default to variable
  return {
    type: NodeType.VARIABLE,
    path: trimmed,
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

    // Parse the expression (could be variable or function)
    const parsedExpr = parseVariable(varName.trim());
    if (parsedExpr.type === NodeType.FUNCTION) {
      parts.push(parsedExpr);
    } else {
      // Keep compatibility with existing format for variables
      parts.push({ var: parsedExpr.path });
    }

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
