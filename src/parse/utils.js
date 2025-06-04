import { NodeType } from './constants.js';
import { parseStringValue } from './variables.js';

/**
 * Parses any value (string, number, boolean, null, object, array)
 * @param {any} value - The value to parse
 * @param {Object} functions - Custom functions object
 * @returns {Object} AST node
 */
export const parseValue = (value, functions) => {
  if (typeof value === 'string') {
    return parseStringValue(value);
  } else if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return parseArray(value, functions);
    } else {
      return parseObject(value, functions);
    }
  } else {
    // Number, boolean, null
    return {
      type: NodeType.LITERAL,
      value
    };
  }
};

/**
 * Parses an array template
 * @param {Array} arr - The array to parse
 * @param {Object} functions - Custom functions object
 * @returns {Object} Array AST node
 */
export const parseArray = (arr, functions) => {
  const items = arr.map(item => parseValue(item, functions));
  const hasDynamicContent = items.some(item => 
    item.type === NodeType.FUNCTION ||
    item.type === NodeType.CONDITIONAL ||
    item.type === NodeType.LOOP ||
    (item.type === NodeType.OBJECT && !item.fast) ||
    (item.type === NodeType.ARRAY && !item.fast)
  );
  
  return {
    type: NodeType.ARRAY,
    items,
    fast: !hasDynamicContent
  };
};

/**
 * Parses an object template
 * @param {Object} obj - The object to parse
 * @param {Object} functions - Custom functions object
 * @returns {Object} Object AST node
 */
export const parseObject = (obj, functions) => {
  const properties = [];
  let hasDynamicContent = false;
  
  for (const [key, value] of Object.entries(obj)) {
    const parsedValue = parseValue(value, functions);
    
    // Check if this property has complex dynamic content (conditionals/loops/functions)
    if (parsedValue.type === NodeType.FUNCTION ||
        parsedValue.type === NodeType.CONDITIONAL ||
        parsedValue.type === NodeType.LOOP ||
        (parsedValue.type === NodeType.OBJECT && !parsedValue.fast) ||
        (parsedValue.type === NodeType.ARRAY && !parsedValue.fast)) {
      hasDynamicContent = true;
    }
    
    properties.push({
      key,
      value: parsedValue
    });
  }
  
  return {
    type: NodeType.OBJECT,
    properties,
    fast: !hasDynamicContent
  };
};