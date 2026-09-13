import { describe, expect, it } from "vitest";
import { parseAndRender } from "../src/index.js";

describe("undefined binding presence is independent of object optimization", () => {
  const cases = {
    plain: { missing: "${notThere}" },
    conditional: { missing: "${notThere}", "$if true": { keep: true } },
    visible: { $when: true, missing: "${notThere}" },
    nested: { missing: "${notThere}", child: { "$if true": { keep: true } } },
  };
  for (const [name, template] of Object.entries(cases)) {
    it(`preserves an own undefined binding in ${name} objects`, () => {
      const rendered = parseAndRender(template, {});
      expect(Object.hasOwn(rendered, "missing")).toBe(true);
      expect(rendered.missing).toBeUndefined();
    });
  }
  it("preserves a function result that is undefined", () => {
    const rendered = parseAndRender(
      { missing: "${missing()}", "$if true": { keep: true } },
      {},
      { functions: { missing: () => undefined } },
    );
    expect(Object.hasOwn(rendered, "missing")).toBe(true);
  });
  it("keeps shallow branch overwrites, including undefined", () => {
    const rendered = parseAndRender(
      { missing: "old", "$if true": { missing: "${notThere}" } },
      {},
    );
    expect(Object.hasOwn(rendered, "missing")).toBe(true);
    expect(rendered.missing).toBeUndefined();
  });
  it("still excludes structural false-when properties and array entries", () => {
    expect(
      parseAndRender({ excluded: { $when: false, value: 1 } }, {}),
    ).toStrictEqual({});
    expect(
      parseAndRender(
        ["${notThere}", { $when: false, value: 1 }, { keep: true }],
        {},
      ),
    ).toStrictEqual([{ keep: true }]);
  });
});
