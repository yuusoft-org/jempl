import { describe, expect, it } from "vitest";
import { parseAndRender } from "../src/index.js";

describe("string escaping", () => {
  it("preserves literal text that resembles escape markers", () => {
    expect(
      parseAndRender(
        {
          placeholder:
            "before __ESCAPED_0__ and __JEMPL_ESCAPE_0__ after \\${name}",
          doubleEscape: "before \\DOUBLE_ESC_VAR after \\${name}",
          doublePath: "before \\DOUBLE_ESC_PATH after \\#{item}",
        },
        { name: "Ada" },
      ),
    ).toStrictEqual({
      placeholder: "before __ESCAPED_0__ and __JEMPL_ESCAPE_0__ after ${name}",
      doubleEscape: "before \\DOUBLE_ESC_VAR after ${name}",
      doublePath: "before \\DOUBLE_ESC_PATH after #{item}",
    });
  });

  it("removes a path escape without requiring a variable interpolation", () => {
    expect(
      parseAndRender({ text: "Use \\#{item} literally" }, {}),
    ).toStrictEqual({
      text: "Use #{item} literally",
    });
  });
});
