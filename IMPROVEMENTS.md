# Jempl Improvement Suggestions

This document outlines potential improvements for the Jempl JSON templating engine, organized by category.

## Table of Contents

- [Documentation](#documentation)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Features](#features)
- [Performance Monitoring](#performance-monitoring)
- [Developer Experience](#developer-experience)
- [Security](#security)
- [Package Configuration](#package-configuration)

---

## Documentation

### Missing Files

| Issue | Priority | Description |
|-------|----------|-------------|
| Use cases README | High | The `docs/use-cases/README.md` is referenced in README.md but doesn't exist |
| CHANGELOG | Medium | Add a `CHANGELOG.md` to track version history and breaking changes |
| CONTRIBUTING guide | Low | Add `CONTRIBUTING.md` with guidelines for external contributors |

### Documentation Enhancements

- [ ] Generate API documentation from JSDoc comments (e.g., using TypeDoc)
- [ ] Add more real-world examples in documentation
- [ ] Create a migration guide for users coming from `json-e`
- [ ] Add troubleshooting section for common errors

---

## Code Quality

### Static Analysis

| Tool | Status | Recommendation |
|------|--------|----------------|
| Prettier | ✅ Configured | - |
| ESLint | ❌ Missing | Add ESLint for static code analysis |
| TypeScript checking | ⚠️ Partial | Enable stricter JSDoc type checking |

### Suggested ESLint Configuration

```javascript
// eslint.config.js (flat config)
export default [
  {
    files: ["src/**/*.js"],
    rules: {
      "no-unused-vars": "error",
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
```

### Code Organization

- [ ] Consider splitting `render.js` if it grows larger (separate optimization tiers)
- [ ] Add inline documentation for complex optimization paths
- [ ] Consider using TypeScript for better type safety (optional)

---

## Testing

### Current State

- ✅ Unit tests via YAML specifications
- ✅ Performance tests
- ✅ Integration tests

### Improvements

| Area | Priority | Description |
|------|----------|-------------|
| Browser testing | High | Add tests in browser environment (jsdom/Playwright) |
| Fuzz testing | Medium | Property-based testing for edge cases |
| Framework integration | Medium | Test with React, Vue, Svelte examples |
| Snapshot testing | Low | Add snapshot tests for AST output |

### Suggested Test Additions

```javascript
// Example: Browser environment test
describe("Browser compatibility", () => {
  it("should work without Node.js APIs", () => {
    // Test in jsdom environment
  });
});

// Example: Property-based test
describe("Fuzz testing", () => {
  it("should handle arbitrary nested structures", () => {
    // Use fast-check or similar library
  });
});
```

---

## Features

### High Priority

| Feature | Description | Use Case |
|---------|-------------|----------|
| Template caching API | Expose parsed AST for caching | Repeated renders with same template |
| Multiplication/Division | Add `*` and `/` operators in conditionals | Mathematical conditions |
| Modulo operator | Add `%` operator | Even/odd checks, pagination |

### Medium Priority

| Feature | Description | Use Case |
|---------|-------------|----------|
| Async function support | Allow async custom functions | I/O operations, API calls |
| Source maps | Map errors to original template location | Debugging |
| Ternary expressions | `${condition ? a : b}` syntax | Inline conditionals |
| Default values | `${user.name ?? "Anonymous"}` | Fallback values |

### Low Priority

| Feature | Description | Use Case |
|---------|-------------|----------|
| Schema validation | Built-in JSON Schema support | Template validation |
| Template inheritance | Extend base templates | Component systems |
| Comments | Allow comments in templates | Documentation |
| Debug mode | Verbose output for troubleshooting | Development |

### Example: Default Values Syntax

```yaml
# Proposed syntax
template:
  name: "${user.name ?? 'Anonymous'}"
  email: "${user.email ?? 'not provided'}"
```

---

## Performance Monitoring

### CI Integration

- [ ] Add automated performance regression tests in CI pipeline
- [ ] Set performance budgets (fail CI if render time exceeds threshold)
- [ ] Track and report bundle size changes on PRs

### Suggested GitHub Action

```yaml
# .github/workflows/performance.yml
name: Performance Check
on: [pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test performance.test.js
      - name: Compare with baseline
        run: # Compare results with main branch
```

### Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Simple variable render | < 0.005ms | ~0.001ms ✅ |
| 100-item loop | < 0.05ms | ~0.029ms ✅ |
| Bundle size (minified) | < 15KB | TBD |
| Bundle size (gzipped) | < 5KB | TBD |

---

## Developer Experience

### Tooling

| Tool | Priority | Description |
|------|----------|-------------|
| VS Code extension | High | Syntax highlighting for Jempl templates in YAML/JSON |
| Playground improvements | Medium | Save/share templates via URL, add more examples |
| CLI tool | Low | Parse/render templates from command line |

### VS Code Extension Features

- Syntax highlighting for `$if`, `$for`, `$when`, `$partial`, `$each`
- Autocomplete for directive keywords
- Error highlighting for common mistakes
- Hover documentation for directives

### Playground Enhancements

- [ ] URL-based template sharing (encode template in URL hash)
- [ ] More built-in examples showcasing all features
- [ ] Side-by-side AST visualization
- [ ] Performance metrics display
- [ ] Dark mode support

---

## Security

### Documentation

- [ ] Add security best practices documentation
- [ ] Document safe usage of custom functions
- [ ] Warn about template injection risks

### Implementation

| Feature | Status | Recommendation |
|---------|--------|----------------|
| Function timeout | ⚠️ Mentioned | Implement/document timeout protection |
| Sandbox mode | ❌ Missing | Consider sandboxed function execution |
| Input validation | ✅ Present | Continue validating during parse phase |

### Security Best Practices Section (for README)

```markdown
## Security Considerations

1. **Custom Functions**: Only use trusted custom functions. Functions have
   access to all data passed to the template.

2. **Template Injection**: Never construct templates from untrusted user input.
   Templates should be defined by developers, not end users.

3. **Data Sanitization**: Sanitize data before passing to templates if it will
   be rendered in HTML contexts.
```

---

## Package Configuration

### Suggested package.json Additions

```json
{
  "keywords": [
    "json",
    "template",
    "templating",
    "yaml",
    "conditionals",
    "loops",
    "partials",
    "interpolation"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "homepage": "https://yuusoft-org.github.io/jempl/",
  "bugs": {
    "url": "https://github.com/yuusoft-org/jempl/issues"
  },
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/yuusoft-org"
  }
}
```

### Additional npm Scripts

```json
{
  "scripts": {
    "lint:eslint": "eslint src",
    "benchmark": "bun test performance.test.js",
    "docs": "typedoc --out docs/api src/index.js",
    "prepublishOnly": "bun run lint && bun test && bun run types"
  }
}
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)

- [ ] Create missing `docs/use-cases/README.md`
- [ ] Add `CHANGELOG.md`
- [ ] Add keywords and metadata to `package.json`
- [ ] Set up ESLint

### Phase 2: Quality & Testing (2-4 weeks)

- [ ] Add browser environment tests
- [ ] Set up performance regression CI
- [ ] Add bundle size tracking

### Phase 3: Features (1-2 months)

- [ ] Implement `*`, `/`, `%` operators
- [ ] Add default value syntax (`??`)
- [ ] Create VS Code extension

### Phase 4: Advanced (3+ months)

- [ ] Async function support
- [ ] Source maps
- [ ] Template caching API

---

## Contributing

If you'd like to help implement any of these improvements, please:

1. Open an issue to discuss the approach
2. Reference this document in your PR
3. Follow the existing code style and conventions

See [DEVELOPMENT.md](./DEVELOPMENT.md) for development setup and guidelines.
