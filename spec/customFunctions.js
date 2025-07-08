import parseAndRender from '../src/parseAndRender.js';

// Example custom functions
const customFunctions = {
  // Math functions
  add: (a, b) => Number(a) + Number(b),
  multiply: (a, b) => Number(a) * Number(b),
  round: (num, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(Number(num) * factor) / factor;
  },
  
  // String functions
  uppercase: (str) => String(str).toUpperCase(),
  capitalize: (str) => {
    const s = String(str);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  },
  length: (str) => String(str).length,
  
  // Collection functions
  join: (arr, delimiter = ',') => Array.isArray(arr) ? arr.join(delimiter) : String(arr),
  size: (obj) => {
    if (Array.isArray(obj)) return obj.length;
    if (typeof obj === 'object' && obj !== null) return Object.keys(obj).length;
    return String(obj).length;
  },
  
  // Utility functions
  concat: (...args) => args.join(''),
  
  // Object-returning functions
  createUser: (name, age) => ({
    name: String(name),
    age: Number(age),
    isAdult: Number(age) >= 18,
    metadata: {
      createdAt: 1640995200000, // Fixed timestamp for testing
      version: 1
    }
  }),
  
  getStats: (items) => ({
    count: Array.isArray(items) ? items.length : 0,
    isEmpty: !Array.isArray(items) || items.length === 0,
    summary: `${Array.isArray(items) ? items.length : 0} items`
  }),
};

export default (template, data) => {
  return parseAndRender(template, data, { functions: customFunctions });
}
