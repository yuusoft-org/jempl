import { parseAndRender, parse, render } from '../../src/index.js';

console.log('=== GOLD MEDAL OPTIMIZATION ANALYSIS ===\n');

// 1. ANALYZE CONDITIONALS IN LOOPS TEMPLATE
console.log('1. CONDITIONALS IN LOOPS ANALYSIS:\n');

const conditionalTemplate = {
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

const conditionalData = {
  items: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    visible: i % 3 !== 0,  // ~67% visible
    highlighted: i % 5 === 0  // ~20% highlighted
  }))
};

console.log('TEMPLATE STRUCTURE:');
console.log('- 100 items in loop');
console.log('- First conditional: item.visible (67% true, 33% false)');
console.log('- Nested conditional: item.highlighted (20% true, 80% false)');
console.log('- When visible=false: entire object should be skipped');
console.log('- When visible=true, highlighted=false: highlight=false, message=${item.name}');
console.log('- When visible=true, highlighted=true: highlight=true, message="...${item.name}"');

const condAst = parse(conditionalTemplate);

function timeOp(name, fn, iterations = 1000) {
  // Warm up
  for (let i = 0; i < 100; i++) fn();
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  const avg = (end - start) / iterations;
  console.log(`${name}: ${(avg * 1000).toFixed(1)}μs`);
  return avg;
}

console.log('\nCONDITIONAL PERFORMANCE:');
timeOp('Conditionals in loops', () => render(condAst, conditionalData));

// Let's see what the result looks like
const condResult = render(condAst, conditionalData);
console.log(`\nResult: ${condResult.items.length} items processed`);
console.log('Sample results:', condResult.items.slice(0, 3));

// 2. ANALYZE TODO APP TEMPLATE
console.log('\n\n2. TODO APP ANALYSIS:\n');

const todoTemplate = [
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

const todoData = {
  title: 'Todo App',
  placeholderText: 'What needs to be done?',
  filteredTodos: Array.from({ length: 50 }, (_, i) => ({
    id: `todo-${i}`,
    title: `Todo item ${i}`,
    completed: i % 3 === 0  // ~33% completed
  })),
  activeCount: 35,
  itemText: 'items',
  completedCount: 15,
  isAllFilter: true,
  isActiveFilter: false,
  isCompletedFilter: false
};

console.log('TEMPLATE STRUCTURE:');
console.log('- Complex nested object structure (6+ levels deep)');
console.log('- 50 todos with conditional rendering per todo');
console.log('- Each todo: conditional based on completed status');
console.log('- Footer: 3 conditional buttons');
console.log('- Heavy use of string interpolation in IDs');

const todoAst = parse(todoTemplate);

console.log('\nTODO APP PERFORMANCE:');
timeOp('Todo app template', () => render(todoAst, todoData));

// Break down the bottlenecks
console.log('\nBOTTLENECK BREAKDOWN:');

// Test just the loop part
const todoLoop = {
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
};

const todoLoopAst = parse(todoLoop);
timeOp('Todo loop only', () => render(todoLoopAst, todoData));

// Test single todo item
const singleTodo = {
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
};

const singleTodoAst = parse(singleTodo);
timeOp('Single todo item', () => render(singleTodoAst, { todo: todoData.filteredTodos[0] }), 10000);

console.log('\n=== OPTIMIZATION TARGETS IDENTIFIED ===');
console.log('1. Conditionals: Need specialized fast path for nested if/else');
console.log('2. Todo app: Deep nesting + conditionals in loops = double penalty');
console.log('3. String interpolation in object keys (rtgl-svg#todo-${todo.id})');
console.log('4. Complex object structures not hitting ultra-fast path');

// Test what pure JS would do
function pureJSConditional() {
  const results = [];
  for (const item of conditionalData.items) {
    if (item.visible) {
      const obj = { id: item.id };
      if (item.highlighted) {
        obj.highlight = true;
        obj.message = `This item is highlighted: ${item.name}`;
      } else {
        obj.highlight = false;
        obj.message = item.name;
      }
      results.push(obj);
    }
  }
  return { items: results };
}

function pureJSTodo() {
  const todos = [];
  for (let i = 0; i < todoData.filteredTodos.length; i++) {
    const todo = todoData.filteredTodos[i];
    const todoObj = {
      'rtgl-view#todo': {}
    };
    
    if (todo.completed) {
      todoObj['rtgl-view#todo'][`rtgl-svg#todo-${todo.id}`] = 'tick';
      todoObj['rtgl-view#todo']['rtgl-text'] = { del: todo.title };
    } else {
      todoObj['rtgl-view#todo'][`rtgl-view#todo-${todo.id}`] = true;
      todoObj['rtgl-view#todo']['rtgl-text'] = todo.title;
    }
    
    todoObj['rtgl-view#todo'][`rtgl-svg#delete-${todo.id}`] = 'cross';
    todos.push(todoObj);
  }
  return todos;
}

console.log('\nPURE JS EQUIVALENTS:');
timeOp('Pure JS conditional', () => pureJSConditional());
timeOp('Pure JS todo loop', () => pureJSTodo());

console.log('\n=== ANALYSIS COMPLETE ===');