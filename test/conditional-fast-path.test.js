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
});
