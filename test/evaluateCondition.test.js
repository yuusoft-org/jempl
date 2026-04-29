import { describe, it, expect } from "vitest";
import { evaluateCondition, parseConditionJson } from "../src/index.js";

describe("evaluateCondition", () => {
  it("evaluates semantic JSON conditions", () => {
    const condition = {
      all: [
        {
          gte: [{ var: "variables.trust" }, 70],
        },
        { var: "variables.metGuide" },
      ],
    };

    expect(
      evaluateCondition(condition, {
        variables: {
          trust: 80,
          metGuide: true,
        },
      }),
    ).toBe(true);

    expect(
      evaluateCondition(condition, {
        variables: {
          trust: 80,
          metGuide: false,
        },
      }),
    ).toBe(false);
  });

  it("treats missing variables as false", () => {
    expect(evaluateCondition({ var: "missing" }, {})).toBe(false);
  });

  it("evaluates string condition expressions", () => {
    expect(
      evaluateCondition("variables.trust >= 70 && variables.metGuide", {
        variables: {
          trust: 75,
          metGuide: true,
        },
      }),
    ).toBe(true);
  });

  it("throws for empty string condition expressions", () => {
    expect(() => evaluateCondition("   ", {})).toThrow(
      "Parse Error: Empty condition expression",
    );
  });

  it("evaluates parsed condition nodes", () => {
    const conditionNode = parseConditionJson({
      in: [{ var: "variables.role" }, { literal: ["admin", "owner"] }],
    });

    expect(
      evaluateCondition(conditionNode, {
        variables: {
          role: "owner",
        },
      }),
    ).toBe(true);
  });

  it("supports custom functions from options", () => {
    const condition = {
      gte: [
        {
          call: "scoreWithBonus",
          args: [{ var: "score" }, { var: "bonus" }],
        },
        100,
      ],
    };

    expect(
      evaluateCondition(
        condition,
        {
          score: 70,
          bonus: 35,
        },
        {
          functions: {
            scoreWithBonus: (score, bonus) => score + bonus,
          },
        },
      ),
    ).toBe(true);
  });

  it("supports legacy functions object options", () => {
    expect(
      evaluateCondition(
        {
          call: "isReady",
        },
        {},
        {
          isReady: () => true,
        },
      ),
    ).toBe(true);
  });
});
