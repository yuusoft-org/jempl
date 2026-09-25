import { describe, expect, it } from "vitest";
import { parseAndRender } from "../src/index.js";

describe("path lookups use own properties", () => {
  it("does not resolve inherited members or select a condition on them", () => {
    const data = { variables: { o: {} } };

    expect(
      parseAndRender(
        {
          inherited: "${variables.o.toString}",
          "$if variables.o.toString": { selected: "inherited" },
          $else: { selected: "missing" },
        },
        data,
      ),
    ).toStrictEqual({ inherited: undefined, selected: "missing" });
  });

  it("still resolves an own property with an inherited member's name", () => {
    expect(
      parseAndRender(
        { value: "${variables.o.toString}" },
        { variables: { o: { toString: "own value" } } },
      ),
    ).toStrictEqual({ value: "own value" });
  });

  it("uses own-property lookup in optimized loop paths", () => {
    expect(
      parseAndRender(
        [{ "$for item in items": { value: "${item.toString}" } }],
        { items: [{}, { toString: "own value" }] },
      ),
    ).toStrictEqual([{ value: undefined }, { value: "own value" }]);

    expect(
      parseAndRender(
        [
          {
            "$for item in items": {
              "$if item.toString": { selected: "own value" },
              $else: { selected: "missing" },
            },
          },
        ],
        { items: [{}, { toString: "own value" }] },
      ),
    ).toStrictEqual([{ selected: "missing" }, { selected: "own value" }]);

    const inherited = Object.create({
      visible: true,
      id: "inherited id",
      name: "inherited name",
      highlighted: true,
    });
    const ownVisible = Object.assign(
      Object.create({
        id: "inherited id",
        name: "inherited name",
        highlighted: true,
      }),
      { visible: true },
    );
    expect(
      parseAndRender(
        {
          items: [
            {
              "$for item in items": {
                "$if item.visible": {
                  id: "${item.id}",
                  "$if item.highlighted": {
                    highlight: true,
                    message: "This item is highlighted: ${item.name}",
                  },
                  $else: {
                    highlight: false,
                    message: "${item.name}",
                  },
                },
              },
            },
          ],
        },
        {
          items: [
            inherited,
            ownVisible,
            {
              visible: true,
              id: "own id",
              name: "own name",
              highlighted: true,
            },
          ],
        },
      ),
    ).toStrictEqual({
      items: [
        { id: undefined, highlight: false, message: undefined },
        {
          id: "own id",
          highlight: true,
          message: "This item is highlighted: own name",
        },
      ],
    });
  });
});
