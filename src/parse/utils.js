import { NodeType, BinaryOp, UnaryOp } from "./constants.js";
import { parseStringValue, parseVariable } from "./variables.js";
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
      if (keys.length === 1 && /^\$for(?::\w+)?\s/.test(keys[0])) {
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
      parsedItem.type === NodeType.PARTIAL ||
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
  let whenCondition = null;

  const entries = Object.entries(obj);
  let i = 0;

  // First pass: check for $partial directive
  if (obj.$partial !== undefined) {
    // Validate partial name
    if (typeof obj.$partial !== "string") {
      throw new JemplParseError("$partial value must be a string");
    }
    if (obj.$partial.trim() === "") {
      throw new JemplParseError("$partial value cannot be an empty string");
    }

    // Check for conflicting directives
    // Note: $when is allowed with $partial since $when controls object inclusion
    const conflictingDirectives = ["$if", "$elif", "$else", "$for"];
    const conflicts = [];
    for (const [key] of entries) {
      // Check for any key that starts with these directives
      for (const directive of conflictingDirectives) {
        if (
          key === directive ||
          key.startsWith(directive + " ") ||
          key.startsWith(directive + "#")
        ) {
          conflicts.push(directive);
          break;
        }
      }
    }
    if (conflicts.length > 0) {
      throw new JemplParseError(
        `Cannot use $partial with ${conflicts.join(", ")} at the same level. ` +
          `Wrap $partial in a parent object if you need conditionals.`,
      );
    }

    // Extract and process sibling properties as data
    // Note: $when is special - it controls whether the partial is rendered
    const { $partial, $when, ...rawData } = obj;

    // Handle escaped $ properties
    const data = {};
    let hasData = false;
    for (const [key, value] of Object.entries(rawData)) {
      let actualKey = key;
      if (key.startsWith("\\$")) {
        // \$price becomes $price
        actualKey = key.slice(1);
      } else if (key.startsWith("$$")) {
        // $$theme becomes $theme
        actualKey = key.slice(1);
      }
      data[actualKey] = value;
      hasData = true;
    }

    // Parse the data object if it exists
    let parsedData = null;
    if (hasData) {
      parsedData = parseValue(data, functions);
      // For partials, we need to check if the data contains any variables or interpolations
      // If it does, we should mark it as non-fast since it needs runtime evaluation
      if (parsedData.type === NodeType.OBJECT) {
        let hasDynamicData = false;
        for (const prop of parsedData.properties) {
          if (
            prop.value.type === NodeType.VARIABLE ||
            prop.value.type === NodeType.INTERPOLATION ||
            prop.value.type === NodeType.FUNCTION ||
            prop.value.type === NodeType.CONDITIONAL ||
            prop.value.type === NodeType.LOOP ||
            (prop.value.type === NodeType.OBJECT && !prop.value.fast) ||
            (prop.value.type === NodeType.ARRAY && !prop.value.fast)
          ) {
            hasDynamicData = true;
            break;
          }
        }
        if (hasDynamicData) {
          parsedData.fast = false;
        }
      }
    }

    const result = {
      type: NodeType.PARTIAL,
      name: $partial,
      data: parsedData,
    };

    // Handle $when condition if present
    if ($when !== undefined) {
      // Parse the when condition
      let whenCondition;
      if (typeof $when === "string") {
        if ($when.trim() === "") {
          throw new JemplParseError("Empty condition expression after '$when'");
        }
        whenCondition = parseConditionExpression($when, functions);
      } else {
        // Boolean or other literal value
        whenCondition = {
          type: NodeType.LITERAL,
          value: $when,
        };
      }
      result.whenCondition = whenCondition;
    }

    return result;
  }

  // Second pass: check for $when directive
  for (const [key, value] of entries) {
    if (key === "$when") {
      if (whenCondition !== null) {
        throw new JemplParseError(
          "Multiple '$when' directives on the same object are not allowed",
        );
      }
      // Allow boolean and string values
      if (value === undefined || value === null) {
        throw new JemplParseError("Missing condition expression after '$when'");
      }
      // Convert non-string values to string for parsing
      const conditionStr =
        typeof value === "string" ? value : JSON.stringify(value);
      if (conditionStr.trim() === "") {
        throw new JemplParseError("Empty condition expression after '$when'");
      }
      whenCondition = parseConditionExpression(conditionStr, functions);
      hasDynamicContent = true;
    } else if (key.startsWith("$when#") || key.startsWith("$when ")) {
      throw new JemplParseError(
        "'$when' does not support ID syntax or inline conditions - use '$when' as a property",
      );
    }
  }

  while (i < entries.length) {
    const [key, value] = entries[i];

    // Skip $when as it's already processed
    if (key === "$when") {
      i++;
      continue;
    }

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
    } else if (/^\$for(?::\w+)?\s/.test(key)) {
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

      // Check if this property has complex dynamic content (conditionals/loops/functions/partials)
      if (
        parsedValue.type === NodeType.FUNCTION ||
        parsedValue.type === NodeType.CONDITIONAL ||
        parsedValue.type === NodeType.LOOP ||
        parsedValue.type === NodeType.PARTIAL ||
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

  const result = {
    type: NodeType.OBJECT,
    properties,
    fast: !hasDynamicContent,
  };

  if (whenCondition) {
    result.whenCondition = whenCondition;
  }

  return result;
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

  const ifCondition = parseConditionExpression(conditionExpr, functions);
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
        const elifCondition = parseConditionExpression(
          elifConditionExpr,
          functions,
        );
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
export const parseConditionExpression = (expr, functions = {}) => {
  expr = expr.trim();

  // Handle parentheses first - but only if they are balanced
  if (expr.startsWith("(") && expr.endsWith(")")) {
    // Check if removing outer parentheses leaves a valid expression
    const inner = expr.slice(1, -1);
    let depth = 0;
    let valid = true;

    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === "(") depth++;
      else if (inner[i] === ")") depth--;

      if (depth < 0) {
        valid = false;
        break;
      }
    }

    if (valid && depth === 0) {
      return parseConditionExpression(inner, functions);
    }
  }

  // Handle logical OR (||) - lowest precedence
  const orMatch = findOperatorOutsideParens(expr, "||");
  if (orMatch !== -1) {
    return {
      type: NodeType.BINARY,
      op: BinaryOp.OR,
      left: parseConditionExpression(
        expr.substring(0, orMatch).trim(),
        functions,
      ),
      right: parseConditionExpression(
        expr.substring(orMatch + 2).trim(),
        functions,
      ),
    };
  }

  // Handle logical AND (&&)
  const andMatch = findOperatorOutsideParens(expr, "&&");
  if (andMatch !== -1) {
    return {
      type: NodeType.BINARY,
      op: BinaryOp.AND,
      left: parseConditionExpression(
        expr.substring(0, andMatch).trim(),
        functions,
      ),
      right: parseConditionExpression(
        expr.substring(andMatch + 2).trim(),
        functions,
      ),
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
        left: parseConditionExpression(
          expr.substring(0, opMatch).trim(),
          functions,
        ),
        right: parseConditionExpression(
          expr.substring(opMatch + op.length).trim(),
          functions,
        ),
      };
    }
  }

  // Handle arithmetic operators (+ and - only)
  // They have the same precedence and should be evaluated left-to-right
  // So we need to find the rightmost occurrence of either + or -
  let lastArithMatch = -1;
  let lastArithOp = null;

  const arithmeticOps = [
    { op: " + ", type: BinaryOp.ADD },
    { op: " - ", type: BinaryOp.SUBTRACT },
  ];

  for (const { op, type } of arithmeticOps) {
    let pos = 0;
    while (pos < expr.length) {
      const match = findOperatorOutsideParens(expr.substring(pos), op);
      if (match === -1) break;

      const actualPos = pos + match;
      if (actualPos > lastArithMatch) {
        lastArithMatch = actualPos;
        lastArithOp = { op, type };
      }
      pos = actualPos + op.length;
    }
  }

  if (lastArithMatch !== -1 && lastArithOp) {
    return {
      type: NodeType.BINARY,
      op: lastArithOp.type,
      left: parseConditionExpression(
        expr.substring(0, lastArithMatch).trim(),
        functions,
      ),
      right: parseConditionExpression(
        expr.substring(lastArithMatch + lastArithOp.op.length).trim(),
        functions,
      ),
    };
  }

  // Check for unsupported arithmetic operators
  const blockedArithmeticOps = [" * ", " / ", " % "];
  for (const op of blockedArithmeticOps) {
    if (findOperatorOutsideParens(expr, op) !== -1) {
      throw new JemplParseError(
        `Arithmetic operations are not allowed in conditionals: "${op}"`,
      );
    }
  }

  // Handle unary NOT (!)
  if (expr.startsWith("!")) {
    return {
      type: NodeType.UNARY,
      op: UnaryOp.NOT,
      operand: parseConditionExpression(expr.substring(1).trim(), functions),
    };
  }

  // Handle literals and variables (including functions)
  return parseIterableExpression(expr, functions);
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

  // Object and array literals for type testing
  if (expr === "{}") {
    return { type: NodeType.LITERAL, value: {} };
  }
  if (expr === "[]") {
    return { type: NodeType.LITERAL, value: [] };
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
 * Parses an iterable expression (variable or function call)
 * @param {string} expr - The iterable expression
 * @param {Object} functions - Custom functions object
 * @returns {Object} Variable or Function AST node
 */
export const parseIterableExpression = (expr, functions) => {
  const trimmed = expr.trim();

  // Fast path: check if it looks like a function call pattern
  // This avoids the expensive try-catch in parseVariable
  const functionMatch = trimmed.match(/^(\w+)\((.*)\)$/);
  if (functionMatch) {
    // It looks like a function call, use parseVariable to handle it properly
    return parseVariable(trimmed, functions);
  }

  // Check for literals first (numbers, booleans, strings, null)
  // This is important for conditionals with literals like "18" or "true"
  const atomicResult = parseAtomicExpression(trimmed);
  if (atomicResult.type === NodeType.LITERAL) {
    return atomicResult;
  }

  // Fast path for simple variables (no operators, no special syntax)
  // This covers 99% of non-function loop iterables
  if (/^[a-zA-Z_$][\w.$]*$/.test(trimmed)) {
    return {
      type: NodeType.VARIABLE,
      path: trimmed,
    };
  }

  // For complex expressions, fall back to parseVariable
  try {
    return parseVariable(trimmed, functions);
  } catch (error) {
    // If parseVariable throws an error about unsupported expressions,
    // fall back to atomic expression parsing or variable
    if (error.message && error.message.includes("not supported")) {
      // Try atomic expression again (which will return a variable if not a literal)
      return atomicResult;
    }
    throw error;
  }
};

/**
 * Parses a loop structure ($for)
 * @param {string} key - The loop key (e.g., "$for p, i in people")
 * @param {any} value - The loop body
 * @param {Object} functions - Custom functions object
 * @returns {Object} Loop AST node
 */
export const parseLoop = (key, value, functions) => {
  // Parse the loop syntax: "$for p, i in people" or "$for:nested p in people"
  // Extract modifier if present
  const forPattern = /^\$for(?::(\w+))?\s+(.+)$/;
  const match = key.match(forPattern);
  if (!match) {
    throw new JemplParseError(`Invalid loop syntax (got: '${key}')`);
  }

  const modifier = match[1]; // 'nested' or undefined
  const loopExpr = match[2].trim();

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

  // Parse the iterable (variable reference or function call)
  const iterable = parseIterableExpression(iterableExpr, functions);

  // Parse the loop body
  const body = parseValue(value, functions);

  return {
    type: NodeType.LOOP,
    itemVar,
    indexVar,
    iterable,
    body,
    flatten: modifier !== "nested", // default true, false if :nested
  };
};
