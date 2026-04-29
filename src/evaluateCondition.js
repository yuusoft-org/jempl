import * as defaultFunctions from "./functions.js";
import { evaluateConditionNode } from "./render.js";
import { JemplParseError } from "./errors.js";
import { parseConditionExpression, parseConditionJson } from "./parse/utils.js";

const isParsedConditionNode = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof value.type === "number";

const getFunctionsOption = (options = {}) => {
  if (!options || typeof options !== "object") {
    return {};
  }

  if (
    Object.prototype.hasOwnProperty.call(options, "functions") ||
    Object.prototype.hasOwnProperty.call(options, "partials")
  ) {
    return options.functions || {};
  }

  return options;
};

const parseConditionInput = (condition, functions) => {
  if (isParsedConditionNode(condition)) {
    return condition;
  }

  if (typeof condition === "string") {
    if (condition.trim() === "") {
      throw new JemplParseError("Empty condition expression");
    }

    return parseConditionExpression(condition, functions);
  }

  return parseConditionJson(condition, functions);
};

/**
 * Evaluates a condition expression, semantic JSON condition, or parsed condition
 * node with the same truthiness behavior used by $if and $when.
 *
 * @param {string|Object|boolean|number|null} condition - Condition to evaluate
 * @param {Object} data - Data context used for variable lookup
 * @param {Object} [options] - Options object or legacy functions object
 * @param {Object.<string, Function>} [options.functions] - Custom functions
 * @returns {boolean} Whether the condition is truthy
 */
const evaluateCondition = (condition, data = {}, options = {}) => {
  const functions = getFunctionsOption(options);
  const allFunctions = { ...defaultFunctions, ...functions };
  const conditionNode = parseConditionInput(condition, allFunctions);

  return Boolean(
    evaluateConditionNode(
      conditionNode,
      { functions: allFunctions, partials: {} },
      data,
      {},
    ),
  );
};

export default evaluateCondition;
