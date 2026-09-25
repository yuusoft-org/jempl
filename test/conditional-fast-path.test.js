import { describe, expect, it } from "vitest";
import { parse, render, parseAndRender } from "../src/index.js";

describe("conditional object fast-path eligibility", () => {
  for (const visible of [false, true]) {
    it(`honors a deeply nested structural $when=${visible}`, () => {
      const template = {
        payload: {
          actions: { nextLine: { $when: visible, sectionId: "next" } },
        },
      };
      expect(parseAndRender(template, {})).toEqual({
        payload: {
          actions: visible ? { nextLine: { sectionId: "next" } } : {},
        },
      });
    });
  }
  it("reevaluates deeply nested structural visibility on reused syntax", () => {
    const ast = parse({
      payload: {
        actions: { nextLine: { $when: "visible", sectionId: "next" } },
      },
    });
    for (const visible of [true, false, true])
      expect(render(ast, { visible })).toEqual({
        payload: {
          actions: visible ? { nextLine: { sectionId: "next" } } : {},
        },
      });
  });
  for (const outer of [true, false]) {
    for (const key of ["${name}", "prefix_${name}"]) {
      it(`resolves object-valued keys in the selected ${outer ? "if" : "else"} fallback with ${key}`, () => {
        const branch = { [key]: { value: 1 }, stamp: "${now()}" };
        const ast = parse({
          "$if outer": outer ? branch : { other: true },
          $else: outer ? { other: true } : branch,
        });
        const functions = { now: () => 123 };

        for (const name of ["resolved", "updated"]) {
          expect(render(ast, { outer, name }, { functions })).toStrictEqual({
            [key.replace("${name}", name)]: { value: 1 },
            stamp: 123,
          });
        }
      });
    }

    for (const depth of [0, 1, 2, 3]) {
      it(`evaluates key helpers once in the selected ${outer ? "if" : "else"} fallback at depth ${depth}`, () => {
        let branch = "${value()}";
        for (let i = 0; i <= depth; i++) branch = { "${nextKey()}": branch };
        const ast = parse({
          "$if outer": outer ? branch : { other: true },
          $else: outer ? { other: true } : branch,
        });

        // Reusing the syntax must evaluate each key again, once per render.
        for (let iteration = 0; iteration < 2; iteration++) {
          const calls = [];
          const functions = {
            nextKey: () => {
              const key = `key${calls.length + 1}`;
              calls.push(key);
              return key;
            },
            value: () => {
              calls.push("value");
              return 42;
            },
          };
          let expected = 42;
          const expectedCalls = [];
          for (let i = depth + 1; i > 0; i--) {
            expected = { [`key${i}`]: expected };
            expectedCalls.unshift(`key${i}`);
          }

          const result = render(ast, { outer }, { functions });
          expect(calls).toStrictEqual([...expectedCalls, "value"]);
          expect(result).toStrictEqual(expected);
        }
      });
    }

    it(`honors $when on the selected ${outer ? "if" : "else"} object`, () => {
      const hidden = { $when: false, value: "must not appear" };
      const template = {
        "$if outer": outer ? hidden : { other: true },
        $else: outer ? { other: true } : hidden,
      };
      expect(parseAndRender(template, { outer })).toEqual({});
    });

    for (const inner of [true, false]) {
      it(`evaluates a nested conditional in the ${outer ? "if" : "else"} object with inner=${inner}`, () => {
        const nested = {
          "$if inner": { value: "yes" },
          $else: { value: "no" },
        };
        const template = {
          "$if outer": outer ? nested : { other: true },
          $else: outer ? { other: true } : nested,
        };
        expect(parseAndRender(template, { outer, inner })).toEqual({
          value: inner ? "yes" : "no",
        });
      });
    }
  }

  it("re-evaluates branch visibility when the same parsed syntax is reused", () => {
    const ast = parse({
      "$if selected": { $when: "visible", value: "${value}" },
      $else: { other: true },
    });
    expect(
      render(ast, { selected: true, visible: true, value: "first" }),
    ).toEqual({ value: "first" });
    expect(
      render(ast, { selected: true, visible: false, value: "second" }),
    ).toEqual({});
    expect(
      render(ast, { selected: true, visible: true, value: "third" }),
    ).toEqual({ value: "third" });
  });

  it("does not leak nested directive keys into an array of layout elements", () => {
    const template = [
      {
        "$if enabled": {
          id: "panel",
          "$if active": { color: "red" },
          $else: { color: "blue" },
        },
        $else: { id: "disabled" },
      },
    ];
    expect(parseAndRender(template, { enabled: true, active: true })).toEqual([
      { id: "panel", color: "red" },
    ]);
  });

  it("retains ordinary literal/binding/interpolation branch results", () => {
    const template = {
      "$if enabled": { id: "${id}", label: "Hello ${name}", fixed: true },
      $else: { fixed: false },
    };
    expect(
      parseAndRender(template, { enabled: true, id: 2, name: "A" }),
    ).toEqual({ id: 2, label: "Hello A", fixed: true });
    expect(parseAndRender(template, { enabled: false })).toEqual({
      fixed: false,
    });
  });

  it("resolves each dynamic key once in an eligible deep object", () => {
    let keyCalls = 0;
    const functions = { nextKey: () => `key${++keyCalls}` };
    const template = {
      "${nextKey()}": {
        "${nextKey()}": { "prefix_${nextKey()}": "Hello ${name}" },
      },
    };

    expect(
      parseAndRender(template, { name: "A" }, { functions }),
    ).toStrictEqual({ key1: { key2: { prefix_key3: "Hello A" } } });
    expect(keyCalls).toBe(3);
  });

  it("does not repeat key helpers when a nested interpolation needs fallback", () => {
    const calls = [];
    const functions = {
      nextKey: () => {
        calls.push("key");
        return "resolved";
      },
      value: () => {
        calls.push("value");
        return 42;
      },
    };
    const template = {
      root: { "${nextKey()}": { nested: "answer: ${value()}" } },
    };

    expect(parseAndRender(template, {}, { functions })).toStrictEqual({
      root: { resolved: { nested: "answer: 42" } },
    });
    expect(calls).toStrictEqual(["key", "value"]);
  });
});
