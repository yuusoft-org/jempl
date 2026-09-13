import { describe, expect, it } from "vitest";
import { parse, render, parseAndRender } from "../src/index.js";

describe("object render paths preserve structure and binding presence", () => {
  for (const depth of [1, 2, 3, 4, 5]) {
    it(`reevaluates structural exclusion at depth ${depth}`, () => {
      let template = { $when: "visible", value: "${value}" };
      for (let i = 0; i < depth; i++) template = { child: template };
      const ast = parse(template);
      const original = structuredClone(template);
      for (const visible of [true, false, true, false]) {
        let expected = visible ? { value: "live" } : undefined;
        for (let i = 0; i < depth; i++) {
          expected = expected === undefined ? {} : { child: expected };
        }
        expect(render(ast, { visible, value: "live" })).toStrictEqual(expected);
      }
      expect(template).toStrictEqual(original);
    });
  }

  for (const count of [1, 5, 6, 10, 11]) {
    for (const enabled of [true, false]) {
      it(`keeps own undefined across ${count}-property ${enabled ? "if" : "else"} branches`, () => {
        const body = { missing: "${missing}" };
        for (let i = 1; i < count; i++) body[`key${i}`] = i;
        // A no-op conditional must not change ordinary property membership.
        const complex = { ...body, "$if true": { keep: true } };
        for (const selected of [body, complex]) {
          const ast = parse({
            "$if enabled": enabled ? selected : { other: true },
            $else: enabled ? { other: true } : selected,
          });
          for (const missing of [
            undefined,
            null,
            0,
            false,
            "",
            "restored",
            undefined,
          ]) {
            const result = render(ast, { enabled, missing });
            const expected = { ...body, missing };
            if (selected === complex) expected.keep = true;
            expect(result).toStrictEqual(expected);
            expect(Object.hasOwn(result, "missing")).toBe(true);
            expect(Object.keys(result)).toEqual(Object.keys(expected));
          }
        }
      });
    }
  }

  it("does not invoke helpers in unselected or structurally excluded branches", () => {
    const calls = [];
    const functions = {
      record: (label) => {
        calls.push(label);
        return undefined;
      },
    };
    const ast = parse({
      "$if selected": {
        $when: "visible",
        missing: "${record('selected')}",
        "$if true": { keep: true },
      },
      $else: { missing: "${record('other')}" },
    });
    expect(
      render(ast, { selected: true, visible: false }, { functions }),
    ).toStrictEqual({});
    expect(calls).toStrictEqual([]);
    expect(
      render(ast, { selected: true, visible: true }, { functions }),
    ).toStrictEqual({ missing: undefined, keep: true });
    expect(calls).toStrictEqual(["selected"]);
    expect(
      render(ast, { selected: false, visible: false }, { functions }),
    ).toStrictEqual({ missing: undefined });
    expect(calls).toStrictEqual(["selected", "other"]);
  });

  it("distinguishes excluded nested objects from undefined bindings in a mixed object", () => {
    expect(
      parseAndRender(
        {
          missing: "${notThere}",
          hidden: { $when: false, value: "not visible" },
          "$if true": { nested: { missing: "${notThere}" } },
        },
        {},
      ),
    ).toStrictEqual({ missing: undefined, nested: { missing: undefined } });
  });
});
