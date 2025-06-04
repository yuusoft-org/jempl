import parse from './parse/index.js';
import render from './render.js';
import * as defaultFunctions from './functions.js';

class Jemp {
  constructor(options) {
    const { customFunctions = {} } = options;
    this.customFunctions = { ...defaultFunctions, ...customFunctions };
  }

  parse = (template) => {
    return parse(template, this.customFunctions);
  }

  render = (ast, data) => {
    return render(ast, this.customFunctions, data);
  }

  parseAndRender = (template, data) => {
    const ast = this.parse(template);
    return this.render(ast, data);
  }
}

export default Jemp
