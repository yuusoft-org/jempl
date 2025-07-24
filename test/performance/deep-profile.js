import { parseAndRender, parse, render } from '../../src/index.js';

// Exact replication of performance test
function profileExact() {
  console.log('=== EXACT PERFORMANCE TEST REPLICATION ===\n');
  
  // 1. Loop test (exact replica)
  const loopTemplate = {
    todos: {
      '$for todo in todos': {
        id: '${todo.id}',
        title: '${todo.title}',
        completed: '${todo.completed}'
      }
    }
  };
  
  const loopAst = parse(loopTemplate);
  const loopData = {
    todos: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      title: `Todo item ${i}`,
      completed: i % 2 === 0
    }))
  };
  
  // Warm up
  for (let i = 0; i < 10; i++) {
    render(loopAst, loopData);
  }
  
  const iterations = 1000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    render(loopAst, loopData);
  }
  
  const end = performance.now();
  const avgTime = (end - start) / iterations;
  
  console.log(`Loop with 100 items (exact test): ${avgTime.toFixed(3)}ms per render`);
  
  // 2. Let's break this down step by step
  console.log('\n=== STEP BY STEP BREAKDOWN ===');
  
  // Profile individual components
  const simpleLoop = {
    '$for todo in todos': {
      id: '${todo.id}',
      title: '${todo.title}',
      completed: '${todo.completed}'
    }
  };
  
  const simpleLoopAst = parse(simpleLoop);
  
  function timeOperation(name, fn, iter = 1000) {
    // Warm up
    for (let i = 0; i < 10; i++) fn();
    
    const start = performance.now();
    for (let i = 0; i < iter; i++) {
      fn();
    }
    const end = performance.now();
    
    const avg = (end - start) / iter;
    console.log(`${name}: ${avg.toFixed(4)}ms`);
    return avg;
  }
  
  timeOperation('Direct loop (no wrapper)', () => render(simpleLoopAst, loopData));
  
  // Profile object creation overhead
  timeOperation('Object wrapper overhead', () => {
    const result = render(simpleLoopAst, loopData);
    return { todos: result };
  });
  
  // Profile string interpolation
  const stringInterp = parse('${todo.title}');
  timeOperation('Single string interpolation', () => render(stringInterp, { todo: loopData.todos[0] }), 10000);
  
  // Profile object creation in loop
  const objCreation = parse('{ id: ${todo.id}, title: ${todo.title} }');
  timeOperation('Object creation per iteration', () => render(objCreation, { todo: loopData.todos[0] }), 10000);
  
  // Now let's see the render call stack
  console.log('\n=== CALL STACK ANALYSIS ===');
  
  // Instrument renderNode to count calls
  let renderNodeCalls = 0;
  let getVariableCalls = 0;
  
  // We need to patch the render function to count calls
  // This is a bit tricky since we can't easily access internal functions
  
  console.log('For 100 loop items with 3 properties each:');
  console.log('Expected renderNode calls: ~400+ (100 items × 4 nodes per item)');
  console.log('Expected variable lookups: ~300+ (100 items × 3 variables)');
  
  // Profile nested loops
  console.log('\n=== NESTED LOOP ANALYSIS ===');
  
  const nestedTemplate = {
    groups: {
      '$for group in groups': {
        name: '${group.name}',
        items: {
          '$for item in group.items': {
            id: '${item.id}',
            name: '${item.name}'
          }
        }
      }
    }
  };
  
  const nestedAst = parse(nestedTemplate);
  const nestedData = {
    groups: Array.from({ length: 10 }, (_, i) => ({
      name: `Group ${i}`,
      items: Array.from({ length: 10 }, (_, j) => ({
        id: `${i}-${j}`,
        name: `Item ${j}`
      }))
    }))
  };
  
  timeOperation('Nested loops (10x10)', () => render(nestedAst, nestedData));
  
  console.log('\nFor nested 10x10 = 100 items:');
  console.log('Expected renderNode calls: ~600+ (complex nesting)');
  console.log('Expected scope creations: ~110 (10 outer + 100 inner)');
}

profileExact();