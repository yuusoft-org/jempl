import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndRender, parse, render } from './src/index.js';

describe('Performance Tests', () => {
  describe('render performance', () => {
    it('should render simple variables quickly', () => {
      const template = {
        name: '${user.name}',
        email: '${user.email}',
        age: '${user.age}'
      };
      
      const ast = parse(template);
      const data = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        }
      };
      
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`Simple variables: ${avgTime.toFixed(3)}ms per render`);
      expect(avgTime).toBeLessThan(0.1); // Should be under 0.1ms
    });

    it('should render loops efficiently', () => {
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
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`Loop with 100 items: ${avgTime.toFixed(3)}ms per render`);
      expect(avgTime).toBeLessThan(2); // Should be under 2ms
    });

    it('should handle nested loops', () => {
      const template = {
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
      
      const ast = parse(template);
      const data = {
        groups: Array.from({ length: 10 }, (_, i) => ({
          name: `Group ${i}`,
          items: Array.from({ length: 10 }, (_, j) => ({
            id: `${i}-${j}`,
            name: `Item ${j}`
          }))
        }))
      };
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`Nested loops (10x10): ${avgTime.toFixed(3)}ms per render`);
      expect(avgTime).toBeLessThan(3); // Should be under 3ms
    });

    it('should handle complex interpolations', () => {
      const template = {
        messages: {
          '$for msg in messages': 'User ${msg.user.firstName} ${msg.user.lastName} said: ${msg.text} at ${msg.timestamp}'
        }
      };
      
      const ast = parse(template);
      const data = {
        messages: Array.from({ length: 50 }, (_, i) => ({
          user: {
            firstName: `First${i}`,
            lastName: `Last${i}`
          },
          text: `This is message number ${i}`,
          timestamp: new Date().toISOString()
        }))
      };
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`Complex interpolations (50 items): ${avgTime.toFixed(3)}ms per render`);
      expect(avgTime).toBeLessThan(1.5); // Should be under 1.5ms
    });

    it('should handle conditionals efficiently', () => {
      const template = {
        items: {
          '$for item in items': {
            '$if item.visible': {
              id: '${item.id}',
              '$if item.highlighted': {
                highlight: true,
                message: 'This item is highlighted: ${item.name}'
              },
              '$else': {
                highlight: false,
                message: '${item.name}'
              }
            }
          }
        }
      };
      
      const ast = parse(template);
      const data = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          visible: i % 3 !== 0,
          highlighted: i % 5 === 0
        }))
      };
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`Conditionals in loops (100 items): ${avgTime.toFixed(3)}ms per render`);
      expect(avgTime).toBeLessThan(2); // Should be under 2ms
    });

    it('should benefit from static content optimization', () => {
      const template = {
        header: {
          title: 'Static Title',
          subtitle: 'Static Subtitle',
          menu: ['Home', 'About', 'Contact']
        },
        dynamic: {
          user: '${user.name}',
          count: '${stats.count}'
        }
      };
      
      const ast = parse(template);
      const data = {
        user: { name: 'John' },
        stats: { count: 42 }
      };
      
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`Mixed static/dynamic content: ${avgTime.toFixed(3)}ms per render`);
      expect(avgTime).toBeLessThan(0.05); // Should be very fast with mostly static content
    });
  });

  describe('parseAndRender performance', () => {
    it('should show overhead of parsing + rendering', () => {
      const template = {
        '$for i in items': {
          id: '${i.id}',
          name: '${i.name}'
        }
      };
      
      const data = {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Item ${i}`
        }))
      };
      
      const iterations = 1000;
      
      // Measure parseAndRender
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        parseAndRender({ template, data });
      }
      const end1 = performance.now();
      const parseAndRenderTime = (end1 - start1) / iterations;
      
      // Measure render only
      const ast = parse(template);
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      const end2 = performance.now();
      const renderOnlyTime = (end2 - start2) / iterations;
      
      const parseOverhead = parseAndRenderTime - renderOnlyTime;
      
      console.log(`ParseAndRender: ${parseAndRenderTime.toFixed(3)}ms`);
      console.log(`Render only: ${renderOnlyTime.toFixed(3)}ms`);
      console.log(`Parse overhead: ${parseOverhead.toFixed(3)}ms (${(parseOverhead/parseAndRenderTime*100).toFixed(1)}%)`);
      
      expect(parseOverhead).toBeGreaterThan(0);
    });
  });

  describe('real-world template performance', () => {
    it('should handle todo app template efficiently', () => {
      const template = [
        {
          'rtgl-view#root': {
            'rtgl-view#app': {
              'rtgl-view#header': {
                'rtgl-text': '${title}',
                'input#todo-input': {
                  placeholder: '${placeholderText}'
                }
              },
              'rtgl-view#main': {
                'rtgl-view#todo-list': {
                  '$for todo, i in filteredTodos': {
                    'rtgl-view#todo': {
                      '$if todo.completed': {
                        'rtgl-svg#todo-${todo.id}': 'tick',
                        'rtgl-text': {
                          del: '${todo.title}'
                        }
                      },
                      '$else': {
                        'rtgl-view#todo-${todo.id}': true,
                        'rtgl-text': '${todo.title}'
                      },
                      'rtgl-svg#delete-${todo.id}': 'cross'
                    }
                  }
                }
              },
              'rtgl-view#footer': {
                'rtgl-text': '${activeCount} ${itemText} left',
                'buttons': {
                  '$if isAllFilter': {
                    'rtgl-button#filter-all': 'All'
                  },
                  '$if isActiveFilter': {
                    'rtgl-button#filter-active': 'Active'
                  },
                  '$if isCompletedFilter': {
                    'rtgl-button#filter-completed': 'Completed'
                  }
                },
                'rtgl-button#clear-completed': 'Clear completed (${completedCount})'
              }
            }
          }
        }
      ];
      
      const ast = parse(template);
      const data = {
        title: 'Todo App',
        placeholderText: 'What needs to be done?',
        filteredTodos: Array.from({ length: 50 }, (_, i) => ({
          id: `todo-${i}`,
          title: `Todo item ${i}`,
          completed: i % 3 === 0
        })),
        activeCount: 35,
        itemText: 'items',
        completedCount: 15,
        isAllFilter: true,
        isActiveFilter: false,
        isCompletedFilter: false
      };
      
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        render({ ast, data, functions: {} });
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      console.log(`Todo app template (50 todos): ${avgTime.toFixed(3)}ms per render`);
      expect(avgTime).toBeLessThan(1); // Should match less than 1ms
    });
  });
});