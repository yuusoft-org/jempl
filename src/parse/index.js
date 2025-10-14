import { parseValue } from "./utils.js";

/**
 * Parses a JSON template into an Abstract Syntax Tree (AST)
 * @param {Object} template - The JSON template to parse
 * @param {Object} [options] - Options object
 * @param {Object.<string, Function>} [options.functions={}] - Custom functions
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
 * // Template with custom functions
 * const ast = parse(
 *   { timestamp: "${formatDate(now())}" },
 *   { functions: {
 *     formatDate: (date) => new Date(date).toISOString(),
 *     now: () => Date.now()
 *   }}
 * );
 */
const parse = (template, options = {}) => {
  const { functions = {} } = options;
  return parseValue(template, functions);
};

export default parse;
