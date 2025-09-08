import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index.js';

describe('Performance Tests - Loops with Functions', () => {
  const customFunctions = {
    sortDate: (posts) => [...posts].sort((a, b) => new Date(a.date) - new Date(b.date)),
    filterBy: (arr, key, value) => arr.filter(item => item[key] === value),
    take: (arr, n) => arr.slice(0, n),
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

    // Loop with function template
    const functionTemplate = {
      posts: {
        '$for post in sortDate(posts)': {
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
    console.log(`Loop with sortDate (100 items): ${functionAvg.toFixed(3)}ms per render`);
    console.log(`Overhead: ${((functionAvg - regularAvg) / regularAvg * 100).toFixed(1)}%`);

    // Function loops should still be reasonably fast
    expect(functionAvg).toBeLessThan(0.5); // 0.5ms is still very fast
    
    // The overhead should not be excessive (less than 200%)
    const overheadRatio = functionAvg / regularAvg;
    expect(overheadRatio).toBeLessThan(3);
  });

  it('should test nested function calls performance', () => {
    const template = {
      topPosts: {
        '$for post in take(sortBy(posts, "views"), 10)': {
          title: '${post.title}',
          views: '${post.views}'
        }
      }
    };

    const data = { posts: generatePosts(1000) }; // Large dataset
    const iterations = 100;

    const ast = parse(template, { functions: customFunctions });

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      render(ast, data, { functions: customFunctions });
    }
    const end = performance.now();
    const avgTime = (end - start) / iterations;

    console.log(`Nested functions (take+sortBy on 1000 items): ${avgTime.toFixed(3)}ms per render`);

    // Even with nested functions and large data, should be fast
    expect(avgTime).toBeLessThan(2); // 2ms is still acceptable
  });

  it('should test parse performance with functions', () => {
    const template = {
      sorted: {
        '$for item in sortDate(items)': {
          name: '${item.name}'
        }
      },
      filtered: {
        '$for item in filterBy(items, "active", true)': {
          name: '${item.name}'
        }
      },
      combined: {
        '$for item in take(sortBy(filterBy(items, "active", true), "score"), 5)': {
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