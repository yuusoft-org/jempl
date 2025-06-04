import parse from './parse/index.js';
import render from './render.js';
import * as defaultFunctions from './functions.js';

/**
 * Parses a template and renders it with data in one step
 * @param {Object} input - Object containing template, data, and optional functions
 * @returns {Object} rendered data
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