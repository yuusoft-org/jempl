import parse from "./parse/index.js";
import render from "./render.js";
import * as defaultFunctions from "./functions.js";

/**
 * Convenience function that parses a template and renders it with data in one step
 * @param {Object} input - Input object
 * @param {any} input.template - The template to parse and render
 * @param {any} input.data - Data to use for variable substitution
 * @param {Object.<string, Function>} [input.functions] - Custom functions
 * @returns {any} The rendered output
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
