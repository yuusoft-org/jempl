import { parse, render } from '../src/index.js';

// Optimized functions that minimize overhead
const customFunctions = {
  // Identity function - just returns the array as-is (minimal overhead)
  identity: (arr) => arr,
  
  // Optimized sort that avoids date parsing on every comparison
  sortDateOptimized: (posts) => {
    // Pre-compute timestamps to avoid repeated date parsing
    const withTimestamps = posts.map(p => ({
      post: p,
      timestamp: new Date(p.date).getTime()
    }));
    
    // Sort by pre-computed timestamps
    withTimestamps.sort((a, b) => a.timestamp - b.timestamp);
    
    // Extract sorted posts
    return withTimestamps.map(item => item.post);
  },
  
  // Original sortDate for comparison
  sortDate: (posts) => [...posts].sort((a, b) => new Date(a.date) - new Date(b.date)),
};

const generatePosts = (count) => {
  // Pre-sorted data to show best-case scenario
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    title: `Post ${i}`,
    date: new Date(2024, 0, i + 1).toISOString(), // Already sorted
    views: Math.floor(Math.random() * 1000),
  }));
};

const data = { posts: generatePosts(100) };
const iterations = 5000;

console.log('⚡ Minimal Overhead Analysis\n');

// Test 1: Regular loop
const regularTemplate = {
  posts: {
    '$for post in posts': {
      title: '${post.title}',
      date: '${post.date}'
    }
  }
};
const regularAst = parse(regularTemplate);

const regularStart = performance.now();
for (let i = 0; i < iterations; i++) {
  render(regularAst, data);
}
const regularAvg = (performance.now() - regularStart) / iterations;
console.log(`Regular loop: ${regularAvg.toFixed(4)}ms`);

// Test 2: Identity function (minimal overhead)
const identityTemplate = {
  posts: {
    '$for post in identity(posts)': {
      title: '${post.title}',
      date: '${post.date}'
    }
  }
};
const identityAst = parse(identityTemplate, { functions: customFunctions });

const identityStart = performance.now();
for (let i = 0; i < iterations; i++) {
  render(identityAst, data, { functions: customFunctions });
}
const identityAvg = (performance.now() - identityStart) / iterations;
console.log(`Identity function: ${identityAvg.toFixed(4)}ms`);
console.log(`Minimal overhead: ${((identityAvg / regularAvg - 1) * 100).toFixed(1)}%\n`);

// Test 3: Original sortDate (with repeated date parsing)
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
console.log(`Original sortDate: ${sortAvg.toFixed(4)}ms`);
console.log(`Overhead: ${((sortAvg / regularAvg - 1) * 100).toFixed(1)}%\n`);

// Test 4: Optimized sortDate
const sortOptTemplate = {
  posts: {
    '$for post in sortDateOptimized(posts)': {
      title: '${post.title}',
      date: '${post.date}'
    }
  }
};
const sortOptAst = parse(sortOptTemplate, { functions: customFunctions });

const sortOptStart = performance.now();
for (let i = 0; i < iterations; i++) {
  render(sortOptAst, data, { functions: customFunctions });
}
const sortOptAvg = (performance.now() - sortOptStart) / iterations;
console.log(`Optimized sortDate: ${sortOptAvg.toFixed(4)}ms`);
console.log(`Overhead: ${((sortOptAvg / regularAvg - 1) * 100).toFixed(1)}%`);
console.log(`Improvement over original: ${((1 - sortOptAvg / sortAvg) * 100).toFixed(1)}%\n`);

console.log('💡 Conclusion:');
console.log(`The loop function feature itself adds only ~${((identityAvg / regularAvg - 1) * 100).toFixed(0)}% overhead.`);
console.log('Most overhead comes from the operations performed by the functions themselves.');
console.log('\nOptimization tips for users:');
console.log('1. Pre-compute expensive operations when possible');
console.log('2. Cache sorted/filtered results if used multiple times');
console.log('3. Use efficient algorithms in custom functions');