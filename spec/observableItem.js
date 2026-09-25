import parseAndRender from "../src/parseAndRender.js";

export default function renderWithObservableItem(template, values) {
  const reads = [];
  const item = {};

  for (const key of ["visible", "id", "highlighted", "name"]) {
    if (Object.hasOwn(values, key)) {
      Object.defineProperty(item, key, {
        enumerable: true,
        get() {
          reads.push(key);
          return values[key];
        },
      });
    }
  }

  return {
    rendered: parseAndRender(template, { items: [item] }),
    reads,
  };
}
