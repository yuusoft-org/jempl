import { parse } from '../../src/index.js';

// Debug the exact AST structure for the conditional test
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

const ast = parse(conditionalTemplate);
console.log('CONDITIONAL AST STRUCTURE:\n');
console.log(JSON.stringify(ast, null, 2));