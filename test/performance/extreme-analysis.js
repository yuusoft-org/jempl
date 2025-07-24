import { parseAndRender, parse, render } from '../../src/index.js';

// Super detailed analysis of the 100-item loop
console.log('=== EXTREME PERFORMANCE ANALYSIS ===\n');

// Test the exact same template as the performance test
const template = {
  todos: {
    '$for todo in todos': {
      id: '${todo.id}',
      title: '${todo.title}',
      completed: '${todo.completed}'
    }
  }
};

const ast = parse(template);
const data = {
  todos: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    title: `Todo item ${i}`,
    completed: i % 2 === 0
  }))
};

console.log('TEMPLATE STRUCTURE:');
console.log('- Outer object (todos)')
console.log('- Loop with 100 items')
console.log('- Each item: 3 properties (id, title, completed)');
console.log('- id: simple variable');
console.log('- title: string interpolation');
console.log('- completed: simple variable\n');

// Break down the costs
function microTime(name, fn, iterations = 10000) {
  // Extra warm up
  for (let i = 0; i < 1000; i++) fn();
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  const avg = (end - start) / iterations;
  console.log(`${name}: ${(avg * 1000).toFixed(1)}μs`);
  return avg;
}

console.log('MICRO-BENCHMARKS:\n');

// 1. Object creation overhead
microTime('Empty object creation', () => ({}));
microTime('Object with 3 props (literals)', () => ({ id: 1, title: 'test', completed: true }));

// 2. Array operations
const items = data.todos;
microTime('Array.push() single item', () => {
  const arr = [];
  arr.push({ id: 1, title: 'test', completed: true });
  return arr;
});

microTime('Array creation from 100 items', () => {
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push({ id: i, title: `Item ${i}`, completed: i % 2 === 0 });
  }
  return results;
});

// 3. String operations
microTime('String interpolation (template literal)', () => `Todo item ${42}`);
microTime('String concatenation', () => 'Todo item ' + 42);

// 4. Property access patterns
const item = items[0];
microTime('Simple property access', () => item.id);
microTime('Multiple property accesses', () => {
  return { id: item.id, title: item.title, completed: item.completed };
});

// 5. Scope operations
const scope = { todo: item };
microTime('Spread operator (3 props)', () => ({ ...scope, extra: 1 }));

console.log('\nACTUAL JEMPL OPERATIONS:\n');

// 6. Test individual components
const loopOnly = parse({ '$for todo in todos': { id: '${todo.id}', title: '${todo.title}', completed: '${todo.completed}' } });
microTime('Loop only (no wrapper)', () => render(loopOnly, data), 1000);

const singleItem = parse({ id: '${todo.id}', title: '${todo.title}', completed: '${todo.completed}' });
microTime('Single item render', () => render(singleItem, { todo: item }), 10000);

const simpleVar = parse('${todo.id}');
microTime('Simple variable', () => render(simpleVar, { todo: item }), 10000);

const stringInterp = parse('${todo.title}');
microTime('String interpolation', () => render(stringInterp, { todo: item }), 10000);

console.log('\nFULL TEMPLATE BREAKDOWN:\n');

// 7. Full template timing
microTime('Full template (100 items)', () => render(ast, data), 1000);

console.log('\nTHEORETICAL MINIMUM:');
console.log('For 100 items × 3 properties each:');

// Calculate theoretical minimum based on micro-benchmarks
const objCreation = microTime('Object creation baseline', () => ({}), 100000);
const propAccess = microTime('Property access baseline', () => item.id, 100000);

const theoretical = (objCreation * 100) + (propAccess * 300); // 100 objects, 300 property accesses
console.log(`Theoretical minimum: ${(theoretical * 1000).toFixed(1)}μs`);

console.log('\nBOTTLENECK ANALYSIS:');
console.log('Current: 73μs for 100 items');
console.log('Target: 10μs for 100 items');
console.log('Need: 7.3x improvement');
console.log('Per item: 0.73μs → 0.10μs');

// Let's see what pure JS can do
function pureJSVersion() {
  const results = [];
  const todos = data.todos;
  for (let i = 0; i < todos.length; i++) {
    const todo = todos[i];
    results.push({
      id: todo.id,
      title: todo.title,
      completed: todo.completed
    });
  }
  return { todos: results };
}

microTime('Pure JS equivalent', () => pureJSVersion(), 1000);

console.log('\n=== ANALYSIS COMPLETE ===');