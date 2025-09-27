/**
 * Custom error classes for Jempl templating engine
 */

export class JemplParseError extends Error {
  constructor(message) {
    super(`Parse Error: ${message}`);
    this.name = "JemplParseError";
  }
}

export class JemplRenderError extends Error {
  constructor(message) {
    super(`Render Error: ${message}`);
    this.name = "JemplRenderError";
  }
}

/**
 * Validation helpers for common error scenarios
 */

/**
 * Validates variable syntax and throws descriptive error
 * @param {string} expr - The variable expression like "${user.name}"
 * @throws {JemplParseError} If syntax is invalid
 */
export const validateVariableSyntax = (expr) => {
  // Only check for truly malformed syntax - unclosed variables
  if (expr.startsWith("${") && !expr.endsWith("}")) {
    throw new JemplParseError(
      `Unclosed variable expression (got: '${expr}') - missing closing '}'`,
    );
  }
};

/**
 * Validates condition expression syntax
 * @param {string} expr - The condition expression
 * @throws {JemplParseError} If syntax is invalid
 */
export const validateConditionExpression = (expr) => {
  if (!expr || expr.trim() === "") {
    throw new JemplParseError("Missing condition expression after '$if'");
  }

  // Check for invalid triple equals first (before incomplete check)
  if (expr.includes("===") || expr.includes("!==")) {
    const suggestion = expr.includes("===") ? "==" : "!=";
    throw new JemplParseError(
      `Invalid comparison operator '${expr.includes("===") ? "===" : "!=="}' - did you mean '${suggestion}'? (got: '${expr}')`,
    );
  }

  // Check for incomplete comparisons
  const incompleteOps = ["<", ">", "<=", ">=", "==", "!="];
  for (const op of incompleteOps) {
    if (expr.trim().endsWith(op)) {
      throw new JemplParseError(
        `Incomplete comparison expression - missing right operand (got: '${expr}')`,
      );
    }
  }
};

/**
 * Validates loop syntax
 * @param {string} expr - The loop expression like "user, index in people"
 * @throws {JemplParseError} If syntax is invalid
 */
export const validateLoopSyntax = (expr) => {
  // Check if ends with " in" (has in but missing iterable)
  if (expr.trim().endsWith(" in")) {
    throw new JemplParseError(
      `Missing iterable expression after 'in' (got: '$for ${expr}')`,
    );
  }

  if (!expr.includes(" in ")) {
    throw new JemplParseError(
      `Invalid loop syntax - missing 'in' keyword (got: '$for ${expr}')`,
    );
  }

  const [varsExpr, iterableExpr] = expr.split(" in ");

  if (!iterableExpr || iterableExpr.trim() === "") {
    throw new JemplParseError(
      `Missing iterable expression after 'in' (got: '$for ${expr}')`,
    );
  }

  // Check for empty variable names and validate identifiers
  const varNames = varsExpr.includes(",")
    ? varsExpr.split(",").map((v) => v.trim())
    : [varsExpr.trim()];

  for (const varName of varNames) {
    if (!varName) {
      throw new JemplParseError(
        `Invalid loop variable - variable name cannot be empty (got: '$for ${expr}')`,
      );
    }
    // Check if valid identifier (starts with letter, $, or _, followed by letters, digits, $, or _)
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(varName)) {
      throw new JemplParseError(`Invalid loop syntax (got: '$for ${expr}')`);
    }
  }
};

/**
 * Validates function exists and throws descriptive error
 * @param {string} name - Function name
 * @param {Object} availableFunctions - Available functions object
 * @throws {JemplParseError} If function doesn't exist
 */
export const validateFunctionExists = (name, availableFunctions) => {
  if (!availableFunctions || !availableFunctions[name]) {
    const available =
      availableFunctions && Object.keys(availableFunctions).length > 0
        ? Object.keys(availableFunctions).join(", ")
        : "none";
    throw new JemplParseError(
      `Unknown function '${name}' (available functions: ${available})`,
    );
  }
};

/**
 * Validates function call syntax
 * @param {string} expr - The function call expression like "${now(}"
 * @throws {JemplParseError} If syntax is invalid
 */
export const validateFunctionCallSyntax = (expr) => {
  // Check for unclosed function calls
  if (expr.includes("(") && !expr.includes(")")) {
    throw new JemplParseError(
      `Unclosed function call (got: '${expr}') - missing closing ')'`,
    );
  }
};

/**
 * Creates render error for variable resolution issues
 * @param {string} path - Variable path like "user.profile.name"
 * @param {string} issue - Description of the issue
 * @returns {JemplRenderError}
 */
export const createVariableRenderError = (path, issue) => {
  return new JemplRenderError(`${issue} at path '${path}'`);
};

/**
 * Creates render error for iteration issues
 * @param {string} expr - Loop expression
 * @param {any} value - The value that couldn't be iterated
 * @param {boolean} isFunction - Whether the iterable is a function call
 * @returns {JemplRenderError}
 */
export const createIterationRenderError = (expr, value, isFunction = false) => {
  if (value === null) {
    return new JemplRenderError(
      `Cannot iterate over null value at '$for ${expr}'`,
    );
  }
  if (value === undefined) {
    return new JemplRenderError(
      `Cannot iterate over undefined value at '$for ${expr}'`,
    );
  }
  const type = typeof value;
  // Use different format for function calls vs variables
  if (isFunction) {
    return new JemplRenderError(
      `Cannot iterate over non-array value in loop '${expr}' - got ${type} instead`,
    );
  }
  return new JemplRenderError(
    `Cannot iterate over non-array value (got: ${type}) at '$for ${expr}'`,
  );
};

/**
 * Creates render error for unknown functions
 * @param {string} name - Function name
 * @param {Object} availableFunctions - Available functions object
 * @returns {JemplRenderError}
 */
export const createUnknownFunctionRenderError = (name, availableFunctions) => {
  const available =
    availableFunctions && Object.keys(availableFunctions).length > 0
      ? Object.keys(availableFunctions).join(", ")
      : "no custom functions provided";
  return new JemplRenderError(`Unknown function '${name}' (${available})`);
};
