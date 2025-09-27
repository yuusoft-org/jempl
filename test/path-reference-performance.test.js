import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index.js';

describe('Path Reference Performance', () => {
  it('should handle path references efficiently', () => {
    const template = {
      products: [
        { '$for product in products': [
            {
              id: '${product.id}',
              name: '${product.name}',
              path: '#{product}',
              pricePath: '#{product.price}'
            }
          ]
        }
      ]
    };

    const data = {
      products: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        price: (i + 1) * 10
      }))
    };

    const ast = parse(template);

    // Warm up
    for (let i = 0; i < 100; i++) {
      render(ast, data);
    }

    // Benchmark
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      render(ast, data);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    console.log(`Path references (100 items): ${avgTime.toFixed(3)}ms per render`);

    // Should be comparable to regular loops (allowing some overhead for path tracking)
    expect(avgTime).toBeLessThan(0.5); // Higher threshold due to path tracking overhead
  });

  it('should handle nested loops with path references', () => {
    const template = {
      categories: [
        {
          '$for category in categories': [
            {
              name: '${category.name}',
              categoryPath: '#{category}',
              products: [
                {
                  '$for product in category.products': [
                    {
                      name: '${product.name}',
                      path: '#{product}',
                      categoryPath: '#{category}'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const data = {
      categories: Array.from({ length: 10 }, (_, i) => ({
        name: `Category ${i + 1}`,
        products: Array.from({ length: 10 }, (_, j) => ({
          name: `Product ${i}-${j}`
        }))
      }))
    };

    const ast = parse(template);

    // Warm up
    for (let i = 0; i < 100; i++) {
      render(ast, data);
    }

    // Benchmark
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      render(ast, data);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    console.log(`Nested loops with path references (10x10): ${avgTime.toFixed(3)}ms per render`);

    // Should be comparable to regular nested loops (allowing for path tracking overhead)
    // changed from 0.2 to 0.6 after adding handling of arithmetic and functions in conditionals
    // changed from 0.6 to 0.7 after adding $each directive support
    expect(avgTime).toBeLessThan(0.7); // Higher threshold due to path reference overhead
  });
});
