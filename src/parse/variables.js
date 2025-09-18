import { NodeType } from "./constants.js";
import { JemplParseError } from "../errors.js";
import {
  parseConditionExpression,
  findOperatorOutsideParens,
} from "./utils.js";

const VARIABLE_REGEX = /\$\{([^}]*)\}/g;
const PATH_REFERENCE_REGEX = /#\{([^}]*)\}/g;

/**
 * Checks if expression is a function call and returns parsed function node
 * @param {string} expr - The expression without ${ and }
 * @param {Object} functions - Available functions for validation
 * @returns {Object} Function node with type, name, and args
 */
const parseFunctionCall = (expr, functions = {}) => {
  const functionMatch = expr.match(/^(\w+)\((.*)\)$/);
  if (!functionMatch) {
    return { isFunction: false };
  }

  const [, name, argsStr] = functionMatch;
  const args = parseArguments(argsStr, functions);

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
 * @param {Object} functions - Available functions for validation
 * @returns {Array} Array of parsed argument nodes
 */
const parseArguments = (argsStr, functions = {}) => {
  if (!argsStr.trim()) return [];

  const args = splitArguments(argsStr);
  return args.map((arg) => parseArgument(arg.trim(), functions));
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
 * @param {Object} functions - Available functions for validation
 * @returns {Object} Parsed argument node
 */
const parseArgument = (arg, functions = {}) => {
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
  const nestedFunction = parseFunctionCall(arg, functions);
  if (nestedFunction.isFunction) {
    return {
      type: nestedFunction.type,
      name: nestedFunction.name,
      args: nestedFunction.args,
    };
  }

  // Check for arithmetic expressions in arguments
  const trimmed = arg.trim();

  // Check for arithmetic operators with spaces (same as in conditional parsing)
  const arithmeticOps = [
    { op: " + ", type: "ADD" },
    { op: " - ", type: "SUBTRACT" },
  ];

  // Find rightmost arithmetic operator for left-to-right evaluation
  let lastArithMatch = -1;
  let lastArithOp = null;

  for (const { op, type } of arithmeticOps) {
    let pos = 0;
    while (pos < trimmed.length) {
      const match = findOperatorOutsideParens(trimmed.substring(pos), op);
      if (match === -1) break;

      const actualPos = pos + match;
      if (actualPos > lastArithMatch) {
        lastArithMatch = actualPos;
        lastArithOp = { op, type };
      }
      pos = actualPos + op.length;
    }
  }

  if (lastArithMatch !== -1) {
    // Found arithmetic, parse as condition expression
    try {
      return parseConditionExpression(trimmed, functions);
    } catch (error) {
      // If condition parsing fails, fall back to variable
      return { type: NodeType.VARIABLE, path: trimmed };
    }
  }

  // Default to variable reference
  return { type: NodeType.VARIABLE, path: trimmed };
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
          `consider calculating the value in your data instead. ` +
          `Offending expression: "${expr}"`,
      );
    } else if (
      expr.includes("||") ||
      expr.includes("&&") ||
      expr.includes("??")
    ) {
      throw new JemplParseError(
        `Logical operators not supported in variable replacements - ` +
          `consider calculating the value in your data instead ` +
          `(operators like ||, &&, ?? are not supported). ` +
          `Offending expression: "${expr}"`,
      );
    } else {
      throw new JemplParseError(
        `Arithmetic expressions not supported in variable replacements - ` +
          `consider calculating '${expr}' in your data instead ` +
          `(expressions with +, -, *, /, % are not supported). ` +
          `Offending expression: "${expr}"`,
      );
    }
  }
};

/**
 * Parses a path reference expression like #{name} or #{item.property}
 * @param {string} expr - The expression without #{ and }
 * @returns {Object} Path reference node
 */
export const parsePathReference = (expr) => {
  const trimmed = expr.trim();

  // Path references don't support functions or complex expressions
  if (FUNCTION_CALL_REGEX.test(trimmed)) {
    throw new JemplParseError(
      `Functions are not supported in path references - ` +
        `path references can only refer to loop variables. ` +
        `Offending expression: "#{${expr}}"`,
    );
  }

  // Check for invalid array syntax
  if (trimmed.includes("[")) {
    throw new JemplParseError(
      `Array indices not supported in path references - ` +
        `use simple variable names or properties. ` +
        `Offending expression: "#{${expr}}"`,
    );
  }

  // Check for arithmetic operators (with or without spaces)
  if (/[+\-*/%]/.test(trimmed)) {
    throw new JemplParseError(
      `Arithmetic expressions not supported in path references - ` +
        `path references can only refer to loop variables. ` +
        `Offending expression: "#{${expr}}"`,
    );
  }

  // Check for logical operators
  if (/\|\||&&/.test(trimmed)) {
    throw new JemplParseError(
      `Logical operators not supported in path references - ` +
        `path references can only refer to loop variables. ` +
        `Offending expression: "#{${expr}}"`,
    );
  }

  // Check for ternary operator
  if (trimmed.includes("?") && trimmed.includes(":")) {
    throw new JemplParseError(
      `Complex expressions not supported in path references - ` +
        `path references can only refer to loop variables. ` +
        `Offending expression: "#{${expr}}"`,
    );
  }

  return {
    type: NodeType.PATH_REFERENCE,
    path: trimmed,
  };
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
  const functionNode = parseFunctionCall(trimmed, functions);
  if (functionNode.isFunction) {
    return {
      type: functionNode.type,
      name: functionNode.name,
      args: functionNode.args,
    };
  }

  // Check if the variable has unclosed array brackets
  // Only check if it looks like a variable path (no spaces, operators, etc.)
  if (trimmed.includes("[") && !/[\s+\-*/%|&?:]/.test(trimmed)) {
    let bracketCount = 0;
    for (const char of trimmed) {
      if (char === "[") bracketCount++;
      else if (char === "]") bracketCount--;
    }
    if (bracketCount !== 0) {
      // Invalid array syntax - treat as literal
      throw new Error("Invalid array index syntax");
    }
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

  // Handle escaped sequences for both ${} and #{}
  if (str.includes("\\${") || str.includes("\\#{")) {
    // First replace \\${ and \\#{ (double escape) with special markers
    processedStr = str.replace(/\\\\(\$\{[^}]*\})/g, "\\DOUBLE_ESC_VAR$1");
    processedStr = processedStr.replace(
      /\\\\(#\{[^}]*\})/g,
      "\\DOUBLE_ESC_PATH$1",
    );

    // Then replace \${ and \#{ (single escape) with placeholders
    processedStr = processedStr.replace(
      /\\(\$\{[^}]*\})/g,
      (match, dollarExpr) => {
        const placeholder = `__ESCAPED_${escapedParts.length}__`;
        escapedParts.push(dollarExpr);
        return placeholder;
      },
    );
    processedStr = processedStr.replace(
      /\\(#\{[^}]*\})/g,
      (match, hashExpr) => {
        const placeholder = `__ESCAPED_${escapedParts.length}__`;
        escapedParts.push(hashExpr);
        return placeholder;
      },
    );

    // Restore double escapes as literal backslash + syntax
    processedStr = processedStr.replace(/\\DOUBLE_ESC_VAR/g, "\\");
    processedStr = processedStr.replace(/\\DOUBLE_ESC_PATH/g, "\\");
  }

  // Don't validate incomplete variables - let them be treated as literals
  // This preserves the original Jempl behavior where incomplete syntax is ignored

  const varMatches = [...processedStr.matchAll(VARIABLE_REGEX)];
  const pathMatches = [...processedStr.matchAll(PATH_REFERENCE_REGEX)];

  // Combine and sort all matches by index
  const allMatches = [
    ...varMatches.map((m) => ({ match: m, type: "variable" })),
    ...pathMatches.map((m) => ({ match: m, type: "pathref" })),
  ].sort((a, b) => a.match.index - b.match.index);

  if (allMatches.length === 0) {
    // No variables or path references, return literal (restore escapes)
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
    allMatches.length === 1 &&
    allMatches[0].match[0] === processedStr &&
    escapedParts.length === 0
  ) {
    // Single variable or path reference that is the entire string, no escapes
    const { match, type } = allMatches[0];
    try {
      if (type === "variable") {
        return parseVariable(match[1], functions);
      } else {
        return parsePathReference(match[1]);
      }
    } catch (e) {
      // Only catch our specific array syntax error
      if (e.message === "Invalid array index syntax") {
        return {
          type: NodeType.LITERAL,
          value: processedStr,
        };
      }
      // Re-throw other errors (like validation errors)
      throw e;
    }
  }

  // Multiple variables or mixed content - create interpolation
  const parts = [];
  let lastIndex = 0;

  for (const { match, type } of allMatches) {
    const [fullMatch, expr] = match;
    const index = match.index;

    // Add literal part before the variable/path reference
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

    // Parse the expression
    try {
      let parsedExpr;
      if (type === "variable") {
        parsedExpr = parseVariable(expr.trim(), functions);
      } else {
        parsedExpr = parsePathReference(expr.trim());
      }
      parts.push(parsedExpr);
    } catch (e) {
      // Only catch our specific array syntax error
      if (e.message === "Invalid array index syntax") {
        parts.push(fullMatch);
      } else {
        // Re-throw other errors (like validation errors)
        throw e;
      }
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
