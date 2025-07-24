import { NodeType } from "./constants.js";
import { JemplParseError } from "../errors.js";

const VARIABLE_REGEX = /\$\{([^}]*)\}/g;

/**
 * Checks if expression is a function call and returns parsed function node
 * @param {string} expr - The expression without ${ and }
 * @returns {Object} Function node with type, name, and args
 */
const parseFunctionCall = (expr) => {
  const functionMatch = expr.match(/^(\w+)\((.*)\)$/);
  if (!functionMatch) {
    return { isFunction: false };
  }

  const [, name, argsStr] = functionMatch;
  const args = parseArguments(argsStr);

  return {
    isFunction: true,
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
  if (
    (arg.startsWith('"') && arg.endsWith('"')) ||
    (arg.startsWith("'") && arg.endsWith("'"))
  ) {
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
  if (nestedFunction.isFunction) {
    return {
      type: nestedFunction.type,
      name: nestedFunction.name,
      args: nestedFunction.args,
    };
  }

  // Default to variable reference
  return { type: NodeType.VARIABLE, path: arg };
};

// Valid function call: word followed by parentheses with any content
const FUNCTION_CALL_REGEX = /^\w+\(.*\)$/;

// Invalid expressions: arithmetic with spaces, logical operators, ternary
const INVALID_EXPR_REGEX = /\s[+\-*/%]\s|\|\||&&|\?\?|.*\?.*:/;

/**
 * Validates variable expression for unsupported syntax
 * @param {string} expr - The expression to validate
 * @throws {JemplParseError} If expression contains unsupported syntax
 */
const validateVariableExpression = (expr) => {
  // Allow empty expressions and function calls
  if (!expr || expr.trim() === "" || FUNCTION_CALL_REGEX.test(expr)) {
    return;
  }

  // Check for invalid expression patterns
  if (INVALID_EXPR_REGEX.test(expr)) {
    // Determine specific error message based on what was found
    if (expr.includes("?") && expr.includes(":")) {
      throw new JemplParseError(
        `Complex expressions not supported in variable replacements - ` +
          `consider calculating the value in your data instead`,
      );
    } else if (
      expr.includes("||") ||
      expr.includes("&&") ||
      expr.includes("??")
    ) {
      throw new JemplParseError(
        `Logical operators not supported in variable replacements - ` +
          `consider calculating the value in your data instead ` +
          `(operators like ||, &&, ?? are not supported)`,
      );
    } else {
      throw new JemplParseError(
        `Arithmetic expressions not supported in variable replacements - ` +
          `consider calculating '${expr}' in your data instead ` +
          `(expressions with +, -, *, /, % are not supported)`,
      );
    }
  }
};

/**
 * Parses a variable expression like ${name} or ${user.profile.name} or function calls like ${now()}
 * @param {string} expr - The expression without ${ and }
 * @param {Object} functions - Available functions for validation
 * @returns {Object} Variable or Function node
 */
export const parseVariable = (expr, functions = {}) => {
  const trimmed = expr.trim();

  // Validate the expression first
  validateVariableExpression(trimmed);

  // Try to parse as function call first
  const functionNode = parseFunctionCall(trimmed);
  if (functionNode.isFunction) {
    return {
      type: functionNode.type,
      name: functionNode.name,
      args: functionNode.args,
    };
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
 * @param {Object} functions - Available functions for validation
 * @returns {Object} Variable, interpolation, or literal node
 */
export const parseStringValue = (str, functions = {}) => {
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

  // Don't validate incomplete variables - let them be treated as literals
  // This preserves the original Jempl behavior where incomplete syntax is ignored

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
    return parseVariable(matches[0][1], functions);
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
    const parsedExpr = parseVariable(varName.trim(), functions);
    parts.push(parsedExpr);

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
