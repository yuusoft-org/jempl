import { parseAndRender, parse, render } from '../../src/index.js';

// Micro-benchmark different aspects of rendering
function microBenchmark(name, fn, iterations = 10000) {
  // Warm up
  for (let i = 0; i < 100; i++) fn();
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  const avgTime = (end - start) / iterations;
  console.log(`${name}: ${avgTime.toFixed(4)}ms per call`);
  return avgTime;
}

// Test data
const simpleData = { name: 'John', age: 30 };
const loopData = {
  items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))
};

console.log('=== PROFILING BOTTLENECKS ===\n');

// 1. Function call overhead
console.log('1. FUNCTION CALL OVERHEAD:');
let counter = 0;
microBenchmark('Empty function call', () => { counter++; });

function testFn(a, b, c) { return a + b + c; }
microBenchmark('Simple function with args', () => testFn(1, 2, 3));

// 2. Variable access patterns
console.log('\n2. VARIABLE ACCESS:');
const obj = { user: { profile: { name: 'John' } } };
microBenchmark('Direct property access', () => obj.user.profile.name);
microBenchmark('Computed property access', () => {
  let current = obj;
  current = current['user'];
  current = current['profile'];
  return current['name'];
});

// 3. Object creation patterns
console.log('\n3. OBJECT CREATION:');
const baseScope = { a: 1, b: 2, c: 3 };
microBenchmark('Object.create()', () => {
  const scope = Object.create(baseScope);
  scope.item = 'test';
  return scope;
});
microBenchmark('Spread operator', () => {
  const scope = { ...baseScope, item: 'test' };
  return scope;
});
microBenchmark('Direct assignment', () => {
  const scope = { a: 1, b: 2, c: 3, item: 'test' };
  return scope;
});

// 4. Array operations
console.log('\n4. ARRAY OPERATIONS:');
const arr = Array.from({ length: 100 }, (_, i) => i);
microBenchmark('forEach', () => {
  let sum = 0;
  arr.forEach(x => sum += x);
  return sum;
});
microBenchmark('for loop', () => {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
});
microBenchmark('for...of', () => {
  let sum = 0;
  for (const x of arr) {
    sum += x;
  }
  return sum;
});

// 5. String operations
console.log('\n5. STRING OPERATIONS:');
const parts = ['Hello', ' ', 'World', '!'];
microBenchmark('String concatenation', () => {
  let result = '';
  for (const part of parts) {
    result += part;
  }
  return result;
});
microBenchmark('Array join', () => parts.join(''));
microBenchmark('Template literal', () => `${parts[0]}${parts[1]}${parts[2]}${parts[3]}`);

// 6. Actual Jempl operations
console.log('\n6. JEMPL OPERATIONS:');

// Simple variable
const simpleAST = parse('${name}');
microBenchmark('Simple variable render', () => render(simpleAST, simpleData));

// Loop with object creation
const loopTemplate = { '$for item in items': { id: '${item.id}', name: '${item.name}' } };
const loopAST = parse(loopTemplate);
microBenchmark('Loop render (100 items)', () => render(loopAST, loopData), 1000);

// Nested structure
const nestedTemplate = {
  '$for group in groups': {
    name: '${group.name}',
    items: {
      '$for item in group.items': {
        id: '${item.id}',
        name: '${item.name}'
      }
    }
  }
};
const nestedData = {
  groups: Array.from({ length: 10 }, (_, i) => ({
    name: `Group ${i}`,
    items: Array.from({ length: 10 }, (_, j) => ({
      id: `${i}-${j}`,
      name: `Item ${j}`
    }))
  }))
};
const nestedAST = parse(nestedTemplate);
microBenchmark('Nested loops (10x10)', () => render(nestedAST, nestedData), 1000);

console.log('\n=== ANALYSIS COMPLETE ===');