import parseAndRender from '../src/parseAndRender.js';

// Comprehensive custom functions for all tests
const customFunctions = {
  // Math functions
  add: (a, b) => Number(a) + Number(b),
  multiply: (a, b) => Number(a) * Number(b),
  subtract: (x, y) => x - y,
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
  getInitials: (firstName, lastName) => {
    const f = String(firstName || '').toUpperCase();
    const l = String(lastName || '').toUpperCase();
    return (f[0] || '') + (l[0] || '');
  },
  
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

  // === Functions for conditionals integration tests ===
  
  // Array/counting functions
  count: (arr) => Array.isArray(arr) ? arr.length : 0,
  
  // Basic arithmetic/value functions
  getValue: (s) => typeof s === 'string' ? s.charCodeAt(0) : 3,
  getStringValue: () => "not a number", // For type error testing
  getBonus: () => 30,
  getPenalty: () => 5,
  doubleValue: (n) => n * 2,
  
  // Range checking
  isInRange: (val, min, max) => val >= min && val <= max,
  
  // Base/modifier functions
  getBase: () => 40,
  getModifier: () => 25,
  
  // Status functions
  isActive: () => true,
  isEnabled: () => true,
  
  // Threshold functions
  getThreshold: () => 10,
  
  // Grade calculation
  getGrade: (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    return 'C';
  },
  
  // Count function for when/condition tests
  getCount: () => 3,
  
  // Validation functions
  isValid: (item) => item.score > 60,
  
  // Calculation functions
  calculate: (v) => v * 1.5,
  
  // Boolean check functions
  isEven: (n) => n % 2 === 0,
  isPrime: (n) => {
    if (n <= 1) return false;
    for (let i = 2; i * i <= n; i++) {
      if (n % i === 0) return false;
    }
    return true;
  },
};

export default (template, data, options = {}) => {
  // Merge custom functions with any functions passed from tests
  const { functions = {}, partials = {} } = options;
  const allFunctions = { ...customFunctions, ...functions };
  
  return parseAndRender(template, data, { functions: allFunctions, partials });
}
