import parseAndRender from '../src/parseAndRender.js';

// Custom functions for loop tests
const loopFunctions = {
  // Sorting functions
  sortDate: (posts) => [...posts].sort((a, b) => new Date(a.date) - new Date(b.date)),
  sortBy: (arr, key) => [...arr].sort((a, b) => b[key] - a[key]),
  sortByAge: (users) => [...users].sort((a, b) => a.age - b.age),
  
  // Filtering functions
  filterBy: (arr, key, value) => arr.filter(item => item[key] === value),
  filterByCategory: (items, catId) => items.filter(item => item.categoryId === catId),
  getActiveUsers: (users) => users.filter(u => u.active),
  
  // Utility functions
  take: (arr, n) => arr.slice(0, n),
  range: (n) => Array.from({length: n}, (_, i) => i),
  getItems: () => [],
  getString: () => "not an array",
  getCategories: () => [{id: "electronics", name: "Electronics"}, {id: "clothing", name: "Clothing"}],
  
  // Transformation functions
  transformUsers: (users) => users.map(u => ({
    displayName: `${u.firstName} ${u.lastName}`,
    joinDate: new Date(u.joined).toLocaleDateString()
  })),
  
  // Built-in function override for testing
  now: () => 1640995200000  // Fixed timestamp for testing
};

export default (template, data) => {
  return parseAndRender(template, data, { functions: loopFunctions });
}