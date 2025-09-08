import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index.js';

describe('Performance Tests - Loops with Functions', () => {
  const customFunctions = {
    // Simple functions with minimal overhead
    reverse: (arr) => arr.slice().reverse(), // Just reverses array order
    take: (arr, n) => arr.slice(0, n), // Simple slice operation
    skip: (arr, n) => arr.slice(n), // Skip first n elements
    identity: (arr) => arr, // No-op function for baseline comparison
    
    // Keep one "real world" function for reference
    sortDate: (posts) => [...posts].sort((a, b) => new Date(a.date) - new Date(b.date)),
    sortBy: (arr, key) => [...arr].sort((a, b) => b[key] - a[key])
  };

  const generatePosts = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      title: `Post ${i}`,
      date: new Date(2024, 0, count - i).toISOString(),
      views: Math.floor(Math.random() * 1000),
      active: i % 3 !== 0
    }));
  };

  it('should compare regular loop vs loop with function', () => {
    // Regular loop template
    const regularTemplate = {
      posts: {
        '$for post in posts': {
          title: '${post.title}',
          date: '${post.date}'
        }
      }
    };

    // Loop with simple function template (minimal overhead)
    const functionTemplate = {
      posts: {
        '$for post in take(posts, 50)': {
          title: '${post.title}',
          date: '${post.date}'
        }
      }
    };

    const data = { posts: generatePosts(100) };
    const iterations = 1000;

    // Parse templates
    const regularAst = parse(regularTemplate);
    const functionAst = parse(functionTemplate, { functions: customFunctions });

    // Benchmark regular loop
    const regularStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      render(regularAst, data, { functions: customFunctions });
    }
    const regularEnd = performance.now();
    const regularAvg = (regularEnd - regularStart) / iterations;

    // Benchmark loop with function
    const functionStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      render(functionAst, data, { functions: customFunctions });
    }
    const functionEnd = performance.now();
    const functionAvg = (functionEnd - functionStart) / iterations;

    console.log(`Regular loop (100 items): ${regularAvg.toFixed(3)}ms per render`);
    console.log(`Loop with take(50) function: ${functionAvg.toFixed(3)}ms per render`);
    console.log(`Overhead: ${((functionAvg - regularAvg) / regularAvg * 100).toFixed(1)}%`);

    // Function loops should still be reasonably fast
    expect(functionAvg).toBeLessThan(0.5); // 0.5ms is still very fast
    
    // With simple functions, overhead should be minimal
    const overheadRatio = functionAvg / regularAvg;
    expect(overheadRatio).toBeLessThan(1.5); // Max 50% overhead for simple functions
    
    // The overhead should be very small for simple array operations
    if (overheadRatio > 1.2) {
      console.warn(`⚠️  Function loop overhead higher than expected: ${overheadRatio.toFixed(1)}x (target: <1.2x)`);
    }
  });

  it('should test with different function complexities', () => {
    const iterations = 1000;
    const data = { posts: generatePosts(100) };

    // Test 1: Identity function (no-op)
    const identityTemplate = {
      posts: {
        '$for post in identity(posts)': {
          title: '${post.title}'
        }
      }
    };
    const identityAst = parse(identityTemplate, { functions: customFunctions });
    
    const identityStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      render(identityAst, data, { functions: customFunctions });
    }
    const identityAvg = (performance.now() - identityStart) / iterations;
    
    // Test 2: Simple slice operation
    const takeTemplate = {
      posts: {
        '$for post in take(posts, 50)': {
          title: '${post.title}'
        }
      }
    };
    const takeAst = parse(takeTemplate, { functions: customFunctions });
    
    const takeStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      render(takeAst, data, { functions: customFunctions });
    }
    const takeAvg = (performance.now() - takeStart) / iterations;
    
    // Test 3: Complex sorting operation
    const sortTemplate = {
      posts: {
        '$for post in sortDate(posts)': {
          title: '${post.title}',
          date: '${post.date}'
        }
      }
    };

    const sortAst = parse(sortTemplate, { functions: customFunctions });
    
    const sortStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      render(sortAst, data, { functions: customFunctions });
    }
    const sortAvg = (performance.now() - sortStart) / iterations;
    
    console.log(`Identity function (no-op): ${identityAvg.toFixed(3)}ms per render`);
    console.log(`Take function (slice): ${takeAvg.toFixed(3)}ms per render`);
    console.log(`SortDate function (complex): ${sortAvg.toFixed(3)}ms per render`);
    
    // Identity should have minimal overhead
    expect(identityAvg).toBeLessThan(0.05);
    // Simple operations should be fast
    expect(takeAvg).toBeLessThan(0.1);
    // Complex operations can be slower but still reasonable
    expect(sortAvg).toBeLessThan(0.5)
  });

  it('should test parse performance with functions', () => {
    const template = {
      sorted: {
        '$for item in sortDate(items)': {
          name: '${item.name}'
        }
      },
      sliced: {
        '$for item in take(items, 10)': {
          name: '${item.name}'
        }
      },
      skipped: {
        '$for item in skip(items, 5)': {
          name: '${item.name}'
        }
      }
    };

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      parse(template, { functions: customFunctions });
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    console.log(`Parse with function loops: ${avgTime.toFixed(3)}ms per parse`);

    // Parse should still be very fast
    expect(avgTime).toBeLessThan(0.1); // 0.1ms parse time is good
  });
});