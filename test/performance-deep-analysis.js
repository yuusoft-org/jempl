import { parse, render } from '../src/index.js';

const customFunctions = {
  sortDate: (posts) => [...posts].sort((a, b) => new Date(a.date) - new Date(b.date)),
  identity: (arr) => arr, // No-op function to isolate function call overhead
  first: (arr) => arr[0], // Returns first element
  slice: (arr) => arr.slice(0, 10), // No sorting, just slicing
};

const generatePosts = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    title: `Post ${i}`,
    date: new Date(2024, 0, count - i).toISOString(),
    views: Math.floor(Math.random() * 1000),
  }));
};

const data = { posts: generatePosts(100) };
const iterations = 10000;

console.log('🔍 Deep Performance Analysis - Loops with Functions\n');

// Test 1: Regular loop baseline
const regularTemplate = {
  posts: {
    '$for post in posts': {
      title: '${post.title}'
    }
  }
};
const regularAst = parse(regularTemplate);

const regularStart = performance.now();
for (let i = 0; i < iterations; i++) {
  render(regularAst, data);
}
const regularTime = performance.now() - regularStart;
const regularAvg = regularTime / iterations;
console.log(`1. Regular loop: ${regularAvg.toFixed(4)}ms per render`);

// Test 2: Loop with identity function (no-op)
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
const identityTime = performance.now() - identityStart;
const identityAvg = identityTime / iterations;
console.log(`2. Loop with identity function: ${identityAvg.toFixed(4)}ms per render`);
console.log(`   Pure function call overhead: ${((identityAvg - regularAvg) / regularAvg * 100).toFixed(1)}%\n`);

// Test 3: Loop with slice function (array copy, no sorting)
const sliceTemplate = {
  posts: {
    '$for post in slice(posts)': {
      title: '${post.title}'
    }
  }
};
const sliceAst = parse(sliceTemplate, { functions: customFunctions });

const sliceStart = performance.now();
for (let i = 0; i < iterations; i++) {
  render(sliceAst, data, { functions: customFunctions });
}
const sliceTime = performance.now() - sliceStart;
const sliceAvg = sliceTime / iterations;
console.log(`3. Loop with slice function: ${sliceAvg.toFixed(4)}ms per render`);
console.log(`   Array copy overhead: ${((sliceAvg - regularAvg) / regularAvg * 100).toFixed(1)}%\n`);

// Test 4: Loop with sortDate (array copy + sorting)
const sortTemplate = {
  posts: {
    '$for post in sortDate(posts)': {
      title: '${post.title}'
    }
  }
};
const sortAst = parse(sortTemplate, { functions: customFunctions });

const sortStart = performance.now();
for (let i = 0; i < iterations; i++) {
  render(sortAst, data, { functions: customFunctions });
}
const sortTime = performance.now() - sortStart;
const sortAvg = sortTime / iterations;
console.log(`4. Loop with sortDate function: ${sortAvg.toFixed(4)}ms per render`);
console.log(`   Sorting overhead: ${((sortAvg - regularAvg) / regularAvg * 100).toFixed(1)}%\n`);

// Test 5: Pre-evaluated function (simulating caching)
const preSortedData = {
  posts: data.posts,
  sortedPosts: customFunctions.sortDate(data.posts)
};
const preSortedTemplate = {
  posts: {
    '$for post in sortedPosts': {
      title: '${post.title}'
    }
  }
};
const preSortedAst = parse(preSortedTemplate);

const preSortedStart = performance.now();
for (let i = 0; i < iterations; i++) {
  render(preSortedAst, preSortedData);
}
const preSortedTime = performance.now() - preSortedStart;
const preSortedAvg = preSortedTime / iterations;
console.log(`5. Pre-sorted data (simulating cache): ${preSortedAvg.toFixed(4)}ms per render`);
console.log(`   Potential speedup with caching: ${((sortAvg - preSortedAvg) / sortAvg * 100).toFixed(1)}%\n`);

// Summary
console.log('📊 Summary:');
console.log(`- Pure function call overhead: ~${((identityAvg - regularAvg) / regularAvg * 100).toFixed(0)}%`);
console.log(`- Array operations overhead: ~${((sortAvg - identityAvg) / regularAvg * 100).toFixed(0)}%`);
console.log(`- Potential optimization with caching: ~${((sortAvg - preSortedAvg) / sortAvg * 100).toFixed(0)}% speedup`);