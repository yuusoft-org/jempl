import parse from "./parse/index.js";
import render from "./render.js";

/**
 * Convenience function that parses a template and renders it with data in one step
 * @param {Object} template - The template to parse and render
 * @param {Object} data - Data to use for variable substitution
 * @param {Object} [options] - Options object
 * @param {Object.<string, Function>} [options.functions] - Custom functions
 * @returns {Object} The rendered output
 * @throws {JemplParseError} When template syntax is invalid
 * @throws {JemplRenderError} When rendering fails
 *
 * @example
 * // Simple usage
 * const result = parseAndRender(
 *   { message: "Hello ${name}!" },
 *   { name: "World" }
 * );
 * // result: { message: "Hello World!" }
 *
 * @example
 * // With conditional logic
 * const result = parseAndRender({
 *   "$if items.length > 0": {
 *     count: "${items.length}",
 *     items: "${items}"
 *   },
 *   "$else": { count: 0, items: [] }
 * }, { items: ["apple", "banana"] });
 * // result: { count: "2", items: ["apple", "banana"] }
 *
 * @example
 * // With custom functions
 * const result = parseAndRender({
 *   greeting: "Hello ${upper(name)}!",
 *   timestamp: "${now()}"
 * }, { name: "world" }, {
 *   functions: {
 *     upper: (str) => str.toUpperCase(),
 *     now: () => Date.now()
 *   }
 * });
 * // result: { greeting: "Hello WORLD!", timestamp: 1234567890123 }
 */
const parseAndRender = (template, data, options = {}) => {
  const { functions = {}, partials = {} } = options;

  // Parse the template into an AST
  const ast = parse(template, { functions });

  // Parse all partials into ASTs
  const parsedPartials = {};
  for (const [name, partialTemplate] of Object.entries(partials)) {
    parsedPartials[name] = parse(partialTemplate, { functions });
  }

  // Render the AST with the data and partials
  return render(ast, data, {
    functions,
    partials: parsedPartials,
  });
};

export default parseAndRender;
