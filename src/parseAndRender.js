import parse from "./parse/index.js";
import render from "./render.js";
import * as defaultFunctions from "./functions.js";

/**
 * Convenience function that parses a template and renders it with data in one step
 * @param {Object} input - Input object
 * @param {Object} input.template - The template to parse and render
 * @param {Object} input.data - Data to use for variable substitution
 * @param {Object.<string, Function>} [input.functions] - Custom functions
 * @returns {Object} The rendered output
 * @throws {JemplParseError} When template syntax is invalid
 * @throws {JemplRenderError} When rendering fails
 * 
 * @example
 * // Simple usage
 * const result = parseAndRender({
 *   template: { message: "Hello ${name}!" },
 *   data: { name: "World" }
 * });
 * // result: { message: "Hello World!" }
 * 
 * @example
 * // With conditional logic
 * const result = parseAndRender({
 *   template: {
 *     "$if items.length > 0": { 
 *       count: "${items.length}",
 *       items: "${items}"
 *     },
 *     "$else": { count: 0, items: [] }
 *   },
 *   data: { items: ["apple", "banana"] }
 * });
 * // result: { count: "2", items: ["apple", "banana"] }
 * 
 * @example
 * // With custom functions
 * const result = parseAndRender({
 *   template: { 
 *     greeting: "Hello ${upper(name)}!",
 *     timestamp: "${now()}"
 *   },
 *   data: { name: "world" },
 *   functions: {
 *     upper: (str) => str.toUpperCase(),
 *     now: () => Date.now()
 *   }
 * });
 * // result: { greeting: "Hello WORLD!", timestamp: 1234567890123 }
 */
const parseAndRender = (input) => {
  const { template, data, functions = {} } = input;

  // Merge default functions with custom functions
  const allFunctions = { ...defaultFunctions, ...functions };

  // Parse the template into an AST
  const ast = parse(template, allFunctions);

  // Render the AST with the data
  return render({ ast, functions: allFunctions, data });
};

export default parseAndRender;
