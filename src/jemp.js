import parse from './parse/index.js';
import render from './render.js';
import renderAndParse from './renderAndParse.js';
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

  renderAndParse = (template, data) => {
    return renderAndParse({ template, data, functions: this.customFunctions });
  }
}

export default Jemp
