import { parseValue } from './utils.js';

/**
 * Parses a template string into an AST
 * @param {Object} template 
 * @param {Object} functions custom functions
 * @returns {Object} AST
 */
const parse = (template, functions = {}) => {
  return parseValue(template, functions);
};

export default parse;