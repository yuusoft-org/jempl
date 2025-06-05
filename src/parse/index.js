import { parseValue } from "./utils.js";

/**
 * Parses a JSON template into an Abstract Syntax Tree (AST)
 * @param {any} template - The JSON template to parse
 * @param {Object.<string, Function>} [functions={}] - Custom functions
 * @returns {Object} The parsed AST
 */
const parse = (template, functions = {}) => {
  return parseValue(template, functions);
};

export default parse;