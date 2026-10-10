import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  parse,
  parseAndRender,
  parseConditionExpression,
} from "../src/index.js";

const INCOMPLETE = /Incomplete (condition|comparison) expression/;

// Expressions with a missing operand. Before the fix, each missing operand
// parsed as the number 0 and the expression silently evaluated.
const incompleteExpressions = [
  "score >",
  "> score",
  "score >=",
  "<= score",
  "score <",
  "flag ==",
  "!= flag",
  "a &&",
  "&& a",
  "a ||",
  "|| a",
  "!",
  "()",
  "a && ( )",
  "a && (score >)",
  "a || (b && (score == ))",
  "a && !",
  "score > > 1",
];

const expectIncomplete = (run) => {
  let error;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  expect(error?.name).toBe("JemplParseError");
  expect(error?.message).toMatch(INCOMPLETE);
};

describe("incomplete condition operands", () => {
  describe.each(incompleteExpressions)("%j", (expression) => {
    const data = { score: 5, flag: false, a: true, b: true };

    it("is rejected by $when", () => {
      expectIncomplete(() =>
        parseAndRender({ items: [{ $when: expression, x: 1 }] }, data),
      );
    });

    it("is rejected by $when at parse time", () => {
      expectIncomplete(() => parse({ $when: expression, x: 1 }));
    });

    it("is rejected by $if", () => {
      expectIncomplete(() =>
        parseAndRender({ [`$if ${expression}`]: { x: 1 } }, data),
      );
    });

    it("is rejected by $elif", () => {
      expectIncomplete(() =>
        parseAndRender(
          { "$if false": { x: 0 }, [`$elif ${expression}`]: { x: 1 } },
          data,
        ),
      );
    });

    it("is rejected by evaluateCondition", () => {
      expectIncomplete(() => evaluateCondition(expression, data));
    });

    it("is rejected by parseConditionExpression", () => {
      expectIncomplete(() => parseConditionExpression(expression));
    });
  });

  it("reports the full original condition for nested operands", () => {
    expect(() => parseConditionExpression("ready && (score >= )")).toThrow(
      "Parse Error: Incomplete condition expression - missing right operand for '>=' (got: 'ready && (score >= )')",
    );
  });

  it("keeps the existing $if message for a trailing comparison operator", () => {
    expect(() => parseAndRender({ "$if score >": { x: 1 } }, {})).toThrow(
      "Parse Error: Incomplete comparison expression - missing right operand (got: 'score >')",
    );
  });

  it("falls back to a variable lookup for an incomplete function argument", () => {
    const functions = { show: (value) => String(value) };

    // Arithmetic arguments are parsed as expressions and fall back to a
    // variable path when parsing fails. An incomplete argument used to
    // evaluate with an invented 0 (a + 1 > 0); it now resolves as unknown.
    expect(
      parseAndRender({ v: "${show(a + 1 >)}" }, { a: 2 }, { functions }),
    ).toEqual({ v: "undefined" });
    expect(
      parseAndRender({ v: "${show(a + 1 > 2)}" }, { a: 2 }, { functions }),
    ).toEqual({ v: "true" });
  });
});

// Seeded generator for random, fully parenthesized condition expressions.
// Each node renders to jempl syntax and to an equivalent JavaScript expression.
const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = (random, items) => items[Math.floor(random() * items.length)];
const spaces = (random) => pick(random, ["", " ", "  "]);
const BOOL_VARS = ["b0", "b1", "b2", "b3"];
const NUM_VARS = ["n0", "n1", "n2", "n3"];
const NUM_LITERALS = ["-3", "-1", "0", "1", "2.5", "7"];
const COMPARISONS = [">", "<", ">=", "<=", "==", "!="];

const leaf = (text) => ({ kind: "leaf", text });

const generateNumber = (random, depth) => {
  if (depth <= 0 || random() < 0.5) {
    return leaf(pick(random, random() < 0.6 ? NUM_VARS : NUM_LITERALS));
  }
  return {
    kind: "arithmetic",
    op: pick(random, ["+", "-"]),
    left: generateNumber(random, depth - 1),
    right: generateNumber(random, depth - 1),
  };
};

const generateBoolean = (random, depth) => {
  const roll = random();
  if (depth <= 0 || roll < 0.2) {
    return leaf(pick(random, [...BOOL_VARS, "true", "false"]));
  }
  if (roll < 0.35) {
    return { kind: "not", operand: generateBoolean(random, depth - 1) };
  }
  if (roll < 0.7) {
    return {
      kind: "logical",
      op: pick(random, ["&&", "||"]),
      left: generateBoolean(random, depth - 1),
      right: generateBoolean(random, depth - 1),
    };
  }
  return {
    kind: "comparison",
    op: pick(random, COMPARISONS),
    left: generateNumber(random, depth - 1),
    right: generateNumber(random, depth - 1),
  };
};

const collectOperandSlots = (node, slots = []) => {
  if (node.kind === "not") {
    slots.push({ node, side: "operand" });
    collectOperandSlots(node.operand, slots);
  } else if (node.kind === "logical" || node.kind === "comparison") {
    slots.push({ node, side: "left" }, { node, side: "right" });
    collectOperandSlots(node.left, slots);
    collectOperandSlots(node.right, slots);
  } else if (node.kind === "arithmetic") {
    // A missing arithmetic operand never parsed as 0 (" + " needs spaces on
    // both sides), so arithmetic nodes are not removal targets.
    collectOperandSlots(node.left, slots);
    collectOperandSlots(node.right, slots);
  }
  return slots;
};

const render = (node, random, removed) => {
  const child = (side, value) => {
    if (removed && removed.node === node && removed.side === side) {
      return { jempl: spaces(random), js: "" };
    }
    const rendered = render(value, random, removed);
    return value.kind === "leaf"
      ? rendered
      : { jempl: `(${rendered.jempl})`, js: rendered.js };
  };

  switch (node.kind) {
    case "leaf":
      return { jempl: node.text, js: node.text };
    case "not": {
      const operand = child("operand", node.operand);
      return {
        jempl: `!${spaces(random)}${operand.jempl}`,
        js: `!(${operand.js})`,
      };
    }
    default: {
      const left = child("left", node.left);
      const right = child("right", node.right);
      // Arithmetic operators require surrounding spaces in jempl.
      const gap = node.kind === "arithmetic" ? " " : spaces(random);
      return {
        jempl: `${left.jempl}${gap}${node.op}${gap}${right.jempl}`,
        js: `(${left.js}) ${node.op} (${right.js})`,
      };
    }
  }
};

const randomData = (random) => ({
  ...Object.fromEntries(BOOL_VARS.map((name) => [name, random() < 0.5])),
  ...Object.fromEntries(
    NUM_VARS.map((name) => [name, Number(pick(random, NUM_LITERALS))]),
  ),
});

const evaluateJs = (js, data) =>
  Boolean(
    new Function(...Object.keys(data), `return (${js});`)(
      ...Object.values(data),
    ),
  );

describe("condition operand completeness properties", () => {
  it("evaluates generated complete expressions like JavaScript", () => {
    const random = createRandom(20261010);

    for (let index = 0; index < 3000; index++) {
      const tree = generateBoolean(random, 4);
      const { jempl, js } = render(tree, random);
      const data = randomData(random);
      const expected = evaluateJs(js, data);
      const context = `${jempl} with ${JSON.stringify(data)}`;

      expect(evaluateCondition(jempl, data), context).toBe(expected);
      expect(
        parseAndRender({ items: [{ $when: jempl, x: 1 }] }, data),
        context,
      ).toEqual({ items: expected ? [{ x: 1 }] : [] });
    }
  });

  it("rejects generated expressions with one operand removed", () => {
    const random = createRandom(31337);
    let checked = 0;

    while (checked < 3000) {
      const tree = generateBoolean(random, 4);
      const slots = collectOperandSlots(tree);
      if (slots.length === 0) {
        continue;
      }
      const removed = pick(random, slots);
      const { jempl } = render(tree, random, removed);

      expectIncomplete(() => parseConditionExpression(jempl));
      expectIncomplete(() =>
        parseAndRender({ items: [{ $when: jempl, x: 1 }] }, randomData(random)),
      );
      checked++;
    }
  });
});
