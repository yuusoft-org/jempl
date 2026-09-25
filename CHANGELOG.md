# Changelog

## 1.1.3

### Fixed

- Escaped variable and path expressions preserve literal marker-like text
  without slowing sharply on long strings.
- Variable, condition, loop, and path-reference lookups ignore inherited
  properties while retaining explicitly supplied properties with those names.
- Optimized conditional loops preserve getter evaluation order and render
  missing values as empty text in highlighted messages.

## 1.1.2

### Fixed

- Conditional object fast paths now respect structural `$when` guards and
  nested conditionals in both selected branches instead of exposing directive
  keys or excluded content.
- Deep-object rendering reevaluates nested `$when` guards when parsed templates
  are reused with new data.
- Ordinary object rendering retains own properties whose whole-value variable
  or function binding evaluates to `undefined`, consistently with optimized
  rendering. Structural exclusions still omit object properties and array
  entries; this does not turn excluded nodes into undefined bindings.

### Tests

- Regression coverage includes both branches, parsed-template reuse, nested
  guards, optimization size boundaries, missing/null/falsy values, shallow
  overwrites, key presence/order and helper calls in skipped branches.
- Run test files sequentially so existing wall-time performance checks do not
  compete with other test workers. No timing thresholds or assertions changed.
