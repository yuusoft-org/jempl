import { NodeType, BinaryOp, UnaryOp } from "./constants.js";
import { parseStringValue } from "./variables.js";
import {
  validateConditionExpression,
  validateLoopSyntax,
  JemplParseError,
} from "../errors.js";

/**
 * Parses any value (string, number, boolean, null, object, array)
 * @param {any} value - The value to parse
 * @param {Object} functions - Custom functions object
 * @returns {Object} AST node
 */
export const parseValue = (value, functions) => {
  if (typeof value === "string") {
    return parseStringValue(value, functions);
  } else if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return parseArray(value, functions);
    } else {
      return parseObject(value, functions);
    }
  } else {
    // Number, boolean, null
    return {
      type: NodeType.LITERAL,
      value,
    };
  }
};

/**
 * Parses an array template
 * @param {Array} arr - The array to parse
 * @param {Object} functions - Custom functions object
 * @returns {Object} Array AST node
 */
export const parseArray = (arr, functions) => {
  const items = [];
  let hasDynamicContent = false;

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    // Check if this is a loop in array syntax
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const keys = Object.keys(item);
      if (keys.length === 1 && keys[0].startsWith("$for ")) {
        const loop = parseLoop(keys[0], item[keys[0]], functions);
        items.push(loop);
        hasDynamicContent = true;
        continue;
      }
    }

    const parsedItem = parseValue(item, functions);
    items.push(parsedItem);

    if (
      parsedItem.type === NodeType.FUNCTION ||
      parsedItem.type === NodeType.CONDITIONAL ||
      parsedItem.type === NodeType.LOOP ||
      (parsedItem.type === NodeType.OBJECT && !parsedItem.fast) ||
      (parsedItem.type === NodeType.ARRAY && !parsedItem.fast)
    ) {
      hasDynamicContent = true;
    }
  }

  return {
    type: NodeType.ARRAY,
    items,
    fast: !hasDynamicContent,
  };
};

/**
 * Parses an object template
 * @param {Object} obj - The object to parse
 * @param {Object} functions - Custom functions object
 * @returns {Object} Object AST node
 */
export const parseObject = (obj, functions) => {
  const properties = [];
  let hasDynamicContent = false;

  const entries = Object.entries(obj);
  let i = 0;

  while (i < entries.length) {
    const [key, value] = entries[i];

    // Check if this is a conditional structure
    if (
      key.startsWith("$if ") ||
      key.match(/^\$if#\w+\s/) ||
      key.match(/^\$if\s+\w+.*:$/)
    ) {
      const conditional = parseConditional(entries, i, functions);
      properties.push({
        key,
        value: conditional.node,
      });
      hasDynamicContent = true;
      i = conditional.nextIndex;
      // Check if this is a loop structure
    } else if (key.startsWith("$for ")) {
      const loop = parseLoop(key, value, functions);
      properties.push({
        key,
        value: loop,
      });
      hasDynamicContent = true;
      i++;
    } else if (key.startsWith("$elif ") || key.startsWith("$else")) {
      // Check for orphaned $elif or $else
      throw new JemplParseError(
        `'${key.split(" ")[0]}' without matching '$if'`,
      );
    } else if (key === "$if" || key === "$if:") {
      // Check for missing condition expression
      throw new JemplParseError("Missing condition expression after '$if'");
    } else {
      const parsedValue = parseValue(value, functions);

      // Check if this property has complex dynamic content (conditionals/loops/functions)
      if (
        parsedValue.type === NodeType.FUNCTION ||
        parsedValue.type === NodeType.CONDITIONAL ||
        parsedValue.type === NodeType.LOOP ||
        (parsedValue.type === NodeType.OBJECT && !parsedValue.fast) ||
        (parsedValue.type === NodeType.ARRAY && !parsedValue.fast)
      ) {
        hasDynamicContent = true;
      }

      // Parse the key for potential variables
      const parsedKey = parseStringValue(key, functions);

      // Only include parsedKey if it's not a simple literal
      const prop = { key, value: parsedValue };
      if (parsedKey.type !== NodeType.LITERAL || parsedKey.value !== key) {
        prop.parsedKey = parsedKey;
      }

      properties.push(prop);
      i++;
    }
  }

  return {
    type: NodeType.OBJECT,
    properties,
    fast: !hasDynamicContent,
  };
};

/**
 * Parses a conditional structure ($if, $elif, $else)
 * @param {Array} entries - Object entries array
 * @param {number} startIndex - Starting index of the $if statement
 * @param {Object} functions - Custom functions object
 * @returns {Object} { node: ConditionalNode, nextIndex: number }
 */
export const parseConditional = (entries, startIndex, functions = {}) => {
  const conditions = [];
  const bodies = [];
  let currentIndex = startIndex;

  // Parse $if (with or without #ID)
  const [ifKey, ifValue] = entries[currentIndex];
  let conditionId = null;
  let conditionExpr;

  if (ifKey.startsWith("$if#")) {
    // Extract ID and condition: "$if#1 age > 18" -> id="1", expr="age > 18"
    const match = ifKey.match(/^\$if#(\w+)\s+(.+)$/);
    if (match) {
      conditionId = match[1];
      conditionExpr = match[2];
    } else {
      throw new JemplParseError(`Invalid conditional syntax: ${ifKey}`);
    }
  } else {
    // Regular $if: "$if age > 18" -> expr="age > 18"
    conditionExpr = ifKey.substring(4); // Remove '$if '

    // Handle YAML syntax with trailing colon: "$if isAllFilter:" -> "isAllFilter"
    if (conditionExpr.endsWith(":")) {
      conditionExpr = conditionExpr.slice(0, -1).trim();
    }
  }

  // Validate condition expression
  validateConditionExpression(conditionExpr);

  const ifCondition = parseConditionExpression(conditionExpr);
  conditions.push(ifCondition);
  bodies.push(parseValue(ifValue, functions));
  currentIndex++;

  // Parse $elif chains (with matching ID if present)
  while (currentIndex < entries.length) {
    const [key, value] = entries[currentIndex];
    let isMatching = false;
    let elifConditionExpr;

    if (conditionId) {
      // Look for $elif#ID or $else#ID with matching ID
      if (key.startsWith(`$elif#${conditionId} `)) {
        elifConditionExpr = key.substring(`$elif#${conditionId} `.length);
        // Handle YAML syntax with trailing colon
        if (elifConditionExpr.endsWith(":")) {
          elifConditionExpr = elifConditionExpr.slice(0, -1).trim();
        }
        isMatching = true;
      } else if (
        key === `$else#${conditionId}` ||
        key === `$else#${conditionId}:`
      ) {
        isMatching = true;
        elifConditionExpr = null; // else branch
      }
    } else {
      // Look for plain $elif or $else
      if (key.startsWith("$elif ")) {
        elifConditionExpr = key.substring(6); // Remove '$elif '
        // Handle YAML syntax with trailing colon
        if (elifConditionExpr.endsWith(":")) {
          elifConditionExpr = elifConditionExpr.slice(0, -1).trim();
        }
        isMatching = true;
      } else if (key === "$else" || key === "$else:") {
        isMatching = true;
        elifConditionExpr = null; // else branch
      }
    }

    if (isMatching) {
      if (elifConditionExpr === null) {
        conditions.push(null); // null represents else branch
      } else {
        // Validate elif condition expression
        validateConditionExpression(elifConditionExpr);
        const elifCondition = parseConditionExpression(elifConditionExpr);
        conditions.push(elifCondition);
      }
      bodies.push(parseValue(value, functions));
      currentIndex++;

      // Break after else
      if (elifConditionExpr === null) {
        break;
      }
    } else {
      break;
    }
  }

  return {
    node: {
      type: NodeType.CONDITIONAL,
      conditions,
      bodies,
      id: conditionId,
    },
    nextIndex: currentIndex,
  };
};

/**
 * Parses a condition expression into an AST node
 * @param {string} expr - The condition expression
 * @returns {Object} AST node representing the condition
 */
export const parseConditionExpression = (expr) => {
  expr = expr.trim();

  // Handle parentheses first
  if (expr.startsWith("(") && expr.endsWith(")")) {
    return parseConditionExpression(expr.slice(1, -1));
  }

  // Handle logical OR (||) - lowest precedence
  const orMatch = findOperatorOutsideParens(expr, "||");
  if (orMatch !== -1) {
    return {
      type: NodeType.BINARY,
      op: BinaryOp.OR,
      left: parseConditionExpression(expr.substring(0, orMatch).trim()),
      right: parseConditionExpression(expr.substring(orMatch + 2).trim()),
    };
  }

  // Handle logical AND (&&)
  const andMatch = findOperatorOutsideParens(expr, "&&");
  if (andMatch !== -1) {
    return {
      type: NodeType.BINARY,
      op: BinaryOp.AND,
      left: parseConditionExpression(expr.substring(0, andMatch).trim()),
      right: parseConditionExpression(expr.substring(andMatch + 2).trim()),
    };
  }

  // Handle comparison operators
  const compOps = [
    { op: ">=", type: BinaryOp.GTE },
    { op: "<=", type: BinaryOp.LTE },
    { op: "==", type: BinaryOp.EQ },
    { op: "!=", type: BinaryOp.NEQ },
    { op: ">", type: BinaryOp.GT },
    { op: "<", type: BinaryOp.LT },
    { op: " in ", type: BinaryOp.IN },
  ];

  for (const { op, type } of compOps) {
    const opMatch = findOperatorOutsideParens(expr, op);
    if (opMatch !== -1) {
      return {
        type: NodeType.BINARY,
        op: type,
        left: parseConditionExpression(expr.substring(0, opMatch).trim()),
        right: parseConditionExpression(
          expr.substring(opMatch + op.length).trim(),
        ),
      };
    }
  }

  // Check for unsupported arithmetic operators
  const arithmeticOps = [" + ", " - ", " * ", " / ", " % "];
  for (const op of arithmeticOps) {
    if (findOperatorOutsideParens(expr, op) !== -1) {
      throw new JemplParseError(
        `Arithmetic expressions not supported in conditionals - ` +
          `consider calculating '${expr}' in your data instead ` +
          `(expressions with +, -, *, /, % are not supported)`,
      );
    }
  }

  // Handle unary NOT (!)
  if (expr.startsWith("!")) {
    return {
      type: NodeType.UNARY,
      op: UnaryOp.NOT,
      operand: parseConditionExpression(expr.substring(1).trim()),
    };
  }

  // Handle literals and variables
  return parseAtomicExpression(expr);
};

/**
 * Finds an operator outside of parentheses
 * @param {string} expr - The expression to search
 * @param {string} operator - The operator to find
 * @returns {number} Index of the operator, or -1 if not found
 */
export const findOperatorOutsideParens = (expr, operator) => {
  let parenDepth = 0;
  let i = 0;

  while (i <= expr.length - operator.length) {
    if (expr[i] === "(") {
      parenDepth++;
    } else if (expr[i] === ")") {
      parenDepth--;
    } else if (
      parenDepth === 0 &&
      expr.substring(i, i + operator.length) === operator
    ) {
      return i;
    }
    i++;
  }

  return -1;
};

/**
 * Parses an atomic expression (variable, number, boolean, string)
 * @param {string} expr - The expression to parse
 * @returns {Object} AST node
 */
export const parseAtomicExpression = (expr) => {
  expr = expr.trim();

  // Boolean literals
  if (expr === "true") {
    return { type: NodeType.LITERAL, value: true };
  }
  if (expr === "false") {
    return { type: NodeType.LITERAL, value: false };
  }
  if (expr === "null") {
    return { type: NodeType.LITERAL, value: null };
  }

  // String literals (quoted)
  if (
    (expr.startsWith('"') && expr.endsWith('"')) ||
    (expr.startsWith("'") && expr.endsWith("'"))
  ) {
    return { type: NodeType.LITERAL, value: expr.slice(1, -1) };
  }

  // Empty string literal
  if (expr === '""' || expr === "''") {
    return { type: NodeType.LITERAL, value: "" };
  }

  // Number literals
  const num = Number(expr);
  if (!isNaN(num) && isFinite(num)) {
    return { type: NodeType.LITERAL, value: num };
  }

  // Variable reference
  return { type: NodeType.VARIABLE, path: expr };
};

/**
 * Parses a loop structure ($for)
 * @param {string} key - The loop key (e.g., "$for p, i in people")
 * @param {any} value - The loop body
 * @param {Object} functions - Custom functions object
 * @returns {Object} Loop AST node
 */
export const parseLoop = (key, value, functions) => {
  // Parse the loop syntax: "$for p, i in people" or "$for p in people"
  const loopExpr = key.substring(5).trim(); // Remove '$for '

  // Validate loop syntax
  validateLoopSyntax(loopExpr);

  // Split on ' in ' to separate variables from iterable
  const inMatch = loopExpr.match(/^(.+?)\s+in\s+(.+)$/);
  if (!inMatch) {
    throw new JemplParseError(
      `Invalid loop syntax - missing 'in' keyword (got: '$for ${loopExpr}')`,
    );
  }

  const varsExpr = inMatch[1].trim();
  const iterableExpr = inMatch[2].trim();

  // Parse variables: "p, i" or "p"
  let itemVar,
    indexVar = null;
  if (varsExpr.includes(",")) {
    const vars = varsExpr.split(",").map((v) => v.trim());
    if (vars.length !== 2) {
      throw new JemplParseError(
        `Invalid loop variables: ${varsExpr}. Expected format: "item" or "item, index"`,
      );
    }
    itemVar = vars[0];
    indexVar = vars[1];
  } else {
    itemVar = varsExpr;
  }

  // Parse the iterable (variable reference)
  const iterable = {
    type: NodeType.VARIABLE,
    path: iterableExpr,
  };

  // Parse the loop body
  const body = parseValue(value, functions);

  return {
    type: NodeType.LOOP,
    itemVar,
    indexVar,
    iterable,
    body,
  };
};
