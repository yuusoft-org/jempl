import { parseValue } from "./utils.js";

/**
 * Parses a JSON template into an Abstract Syntax Tree (AST)
 * @param {Object} template - The JSON template to parse
 * @param {Object.<string, Function>} [functions={}] - Custom functions
 * @returns {Object} The parsed AST
 * @throws {JemplParseError} When template syntax is invalid (malformed conditions, loops, variables, etc.)
 *
 * @example
 * // Simple variable template
 * const ast = parse({ message: "Hello ${name}!" });
 *
 * @example
 * // Template with conditional
 * const ast = parse({
 *   "$if user.isAdmin": { role: "admin" },
 *   "$else": { role: "user" }
 * });
 *
 * @example
 * // Template with custom function
 * const ast = parse(
 *   { timestamp: "${formatDate(now())}" },
 *   { formatDate: (date) => new Date(date).toISOString() }
 * );
 */
const parse = (template, functions = {}) => {
  return parseValue(template, functions);
};

export default parse;
