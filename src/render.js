import { NodeType, BinaryOp, UnaryOp } from "./parse/constants.js";
import {
  createIterationRenderError,
  createUnknownFunctionRenderError,
} from "./errors.js";

/**
 * Renders a parsed AST with data to produce the final output
 * @param {Object} ast - The parsed AST to render
 * @param {Object} data - Data to use for variable substitution
 * @param {Object.<string, Function>} [functions={}] - Custom functions
 * @returns {Object} The rendered output
 * @throws {JemplRenderError} When rendering fails (unknown functions, invalid iteration, etc.)
 *
 * @example
 * // Render a simple template
 * const ast = parse({ message: "Hello ${name}!" });
 * const result = render(ast, { name: "World" });
 * // result: { message: "Hello World!" }
 *
 * @example
 * // Render with conditional logic
 * const ast = parse({
 *   "$if user.isAdmin": { role: "admin", permissions: ["read", "write"] },
 *   "$else": { role: "user", permissions: ["read"] }
 * });
 * const result = render(ast, { user: { isAdmin: true } });
 * // result: { role: "admin", permissions: ["read", "write"] }
 *
 * @example
 * // Render with custom functions
 * const ast = parse({ timestamp: "${now()}" });
 * const result = render(ast, {}, { now: () => Date.now() });
 * // result: { timestamp: 1234567890123 }
 */
const render = (ast, data, functions = {}) => {
  return renderNode(ast, functions, data, {});
};

/**
 * Renders a single AST node
 * @param {Object} node
 * @param {Object} functions
 * @param {Object} data
 * @param {Object} scope - local scope for loops
 * @returns {any} rendered value
 */
const renderNode = (node, functions, data, scope) => {
  switch (node.type) {
    case NodeType.LITERAL:
      return node.value;

    case NodeType.VARIABLE:
      return getVariableValue(node.path, data, scope);

    case NodeType.INTERPOLATION:
      return renderInterpolation(node.parts, functions, data, scope);

    case NodeType.FUNCTION:
      return renderFunction(node, functions, data, scope);

    case NodeType.BINARY:
      return renderBinaryOperation(node, functions, data, scope);

    case NodeType.UNARY:
      return renderUnaryOperation(node, functions, data, scope);

    case NodeType.CONDITIONAL:
      return renderConditional(node, functions, data, scope);

    case NodeType.LOOP:
      return renderLoop(node, functions, data, scope);

    case NodeType.OBJECT:
      return renderObject(node, functions, data, scope);

    case NodeType.ARRAY:
      return renderArray(node, functions, data, scope);

    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
};

/**
 * Gets a variable value from data or scope using dot notation
 */
const getVariableValue = (path, data, scope) => {
  if (!path) return undefined;

  // Check local scope first (for loop variables)
  if (scope.hasOwnProperty(path)) {
    return scope[path];
  }

  // Split path and traverse
  const parts = path.split(".");
  let current = data;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Check scope first for each part
    if (scope.hasOwnProperty(part)) {
      current = scope[part];
      continue;
    }

    if (current == null) {
      // Return undefined for missing variables - this preserves original Jempl behavior
      // where missing variables are silently ignored
      return undefined;
    }

    current = current[part];
  }

  return current;
};

/**
 * Renders string interpolation
 */
const renderInterpolation = (parts, functions, data, scope) => {
  let result = "";

  for (const part of parts) {
    if (typeof part === "string") {
      result += part;
    } else {
      // Handle AST nodes (variables, functions, etc.)
      const value = renderNode(part, functions, data, scope);
      result += value != null ? String(value) : "";
    }
  }

  return result;
};

/**
 * Renders function calls
 */
const renderFunction = (node, functions, data, scope) => {
  const func = functions[node.name];
  if (!func) {
    throw createUnknownFunctionRenderError(node.name, functions);
  }

  const args = node.args.map((arg) => renderNode(arg, functions, data, scope));
  return func(...args);
};

/**
 * Evaluates a condition node without converting undefined to string
 */
const evaluateCondition = (node, functions, data, scope) => {
  switch (node.type) {
    case NodeType.VARIABLE:
      // For conditions, return the actual value without converting undefined to string
      return getVariableValue(node.path, data, scope);

    case NodeType.LITERAL:
      return node.value;

    case NodeType.BINARY:
      return renderBinaryOperation(node, functions, data, scope);

    case NodeType.UNARY:
      return renderUnaryOperation(node, functions, data, scope);

    case NodeType.FUNCTION:
      return renderFunction(node, functions, data, scope);

    default:
      // For other node types, use regular rendering
      return renderNode(node, functions, data, scope);
  }
};

/**
 * Renders binary operations
 */
const renderBinaryOperation = (node, functions, data, scope) => {
  // For logical operations, use evaluateCondition to preserve undefined
  if (node.op === BinaryOp.AND || node.op === BinaryOp.OR) {
    const left = evaluateCondition(node.left, functions, data, scope);
    const right = evaluateCondition(node.right, functions, data, scope);

    switch (node.op) {
      case BinaryOp.AND:
        return left && right;
      case BinaryOp.OR:
        return left || right;
    }
  }

  // For other operations, use renderNode
  const left = renderNode(node.left, functions, data, scope);
  const right = renderNode(node.right, functions, data, scope);

  switch (node.op) {
    case BinaryOp.EQ:
      return left == right;
    case BinaryOp.NEQ:
      return left != right;
    case BinaryOp.GT:
      return left > right;
    case BinaryOp.LT:
      return left < right;
    case BinaryOp.GTE:
      return left >= right;
    case BinaryOp.LTE:
      return left <= right;
    case BinaryOp.IN:
      return Array.isArray(right) ? right.includes(left) : false;
    default:
      throw new Error(`Unknown binary operator: ${node.op}`);
  }
};

/**
 * Renders unary operations
 */
const renderUnaryOperation = (node, functions, data, scope) => {
  // For NOT operation, use evaluateCondition to preserve undefined
  const operand =
    node.op === UnaryOp.NOT
      ? evaluateCondition(node.operand, functions, data, scope)
      : renderNode(node.operand, functions, data, scope);

  switch (node.op) {
    case UnaryOp.NOT:
      return !operand;
    default:
      throw new Error(`Unknown unary operator: ${node.op}`);
  }
};

/**
 * Renders conditional statements
 */
const renderConditional = (node, functions, data, scope) => {
  for (let i = 0; i < node.conditions.length; i++) {
    const condition = node.conditions[i];

    // null condition means else branch
    if (condition === null) {
      return renderNode(node.bodies[i], functions, data, scope);
    }

    // Evaluate condition - don't convert undefined to "undefined" string
    const conditionValue = evaluateCondition(condition, functions, data, scope);
    if (conditionValue) {
      return renderNode(node.bodies[i], functions, data, scope);
    }
  }

  // No condition matched, return empty object
  return {};
};

/**
 * Renders loops
 */
const renderLoop = (node, functions, data, scope) => {
  const iterable = renderNode(node.iterable, functions, data, scope);

  if (!Array.isArray(iterable)) {
    // Create the loop expression for error message
    const loopExpr = `${node.itemVar}${node.indexVar ? `, ${node.indexVar}` : ""} in ${node.iterable.path}`;
    throw createIterationRenderError(loopExpr, iterable);
  }

  const results = [];

  for (let i = 0; i < iterable.length; i++) {
    const newScope = Object.create(scope);
    newScope[node.itemVar] = iterable[i];

    if (node.indexVar) {
      newScope[node.indexVar] = i;
    }

    const rendered = renderNode(node.body, functions, data, newScope);

    // If the body is an array with a single item, unwrap it
    if (Array.isArray(rendered) && rendered.length === 1) {
      results.push(rendered[0]);
    } else {
      results.push(rendered);
    }
  }

  return results;
};

/**
 * Renders objects
 */
const renderObject = (node, functions, data, scope) => {
  const result = {};
  let conditionalResult = null;
  let hasNonConditionalProperties = false;

  // Check if this object has only conditional properties
  for (const prop of node.properties) {
    if (
      !prop.key.startsWith("$if ") &&
      !prop.key.match(/^\$if\s+\w+.*:?$/) &&
      !prop.key.startsWith("$elif") &&
      !prop.key.startsWith("$else") &&
      !prop.key.startsWith("$for ")
    ) {
      hasNonConditionalProperties = true;
      break;
    }
  }

  for (const prop of node.properties) {
    if (prop.key.startsWith("$if ") || prop.key.match(/^\$if\s+\w+.*:?$/)) {
      const rendered = renderNode(prop.value, functions, data, scope);

      // If object has only conditionals and the result is non-object, replace the entire object
      if (
        !hasNonConditionalProperties &&
        rendered !== null &&
        rendered !== undefined
      ) {
        // If the result is an array with a single item, unwrap it
        if (Array.isArray(rendered) && rendered.length === 1) {
          return rendered[0];
        }
        return rendered;
      }

      // Otherwise merge rendered object into result
      if (
        typeof rendered === "object" &&
        rendered !== null &&
        !Array.isArray(rendered)
      ) {
        Object.assign(result, rendered);
      }
    } else if (prop.key.startsWith("$for ")) {
      // This is a loop inside an object - it should not set any properties directly
      // The parent object property should get the loop result
      // Skip this - it will be handled by the parent context
    } else {
      const propValue = prop.value;

      // Check if this property contains a loop
      if (
        propValue &&
        propValue.type === NodeType.OBJECT &&
        propValue.properties
      ) {
        const loopProp = propValue.properties.find((p) =>
          p.key.startsWith("$for "),
        );
        if (loopProp) {
          // This property contains a loop - render the loop and assign the result
          const loopResult = renderNode(loopProp.value, functions, data, scope);
          if (loopResult !== undefined) {
            result[prop.key] = loopResult;
          }
        } else {
          const renderedValue = renderNode(prop.value, functions, data, scope);
          if (renderedValue !== undefined) {
            result[prop.key] = renderedValue;
          }
        }
      } else {
        // Render the key if it contains variables
        const renderedKey = prop.parsedKey
          ? renderNode(prop.parsedKey, functions, data, scope)
          : prop.key;
        const renderedValue = renderNode(prop.value, functions, data, scope);

        // Only add the property if the value is not undefined
        if (renderedValue !== undefined) {
          result[renderedKey] = renderedValue;
        }
      }
    }
  }

  return result;
};

/**
 * Renders arrays
 */
const renderArray = (node, functions, data, scope) => {
  const results = [];

  for (const item of node.items) {
    if (item.type === NodeType.LOOP) {
      // Keep loop results as a single array item
      const loopResults = renderNode(item, functions, data, scope);
      results.push(loopResults);
    } else {
      results.push(renderNode(item, functions, data, scope));
    }
  }

  return results;
};

export default render;
