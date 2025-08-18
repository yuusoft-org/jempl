# Jempl Development Guide

Welcome to the Jempl codebase! This guide will help you get up to speed with our development practices, conventions, and tooling.

## Overview

Jempl is a high-performance JSON templating engine with conditionals, loops, partials, and custom functions. The codebase is written in modern JavaScript using functional programming patterns and is optimized for sub-millisecond rendering performance.

## Prerequisites

- **Bun** (not Node.js) - This project uses Bun as its JavaScript runtime and package manager
- Basic understanding of functional programming concepts
- Familiarity with ESM modules

## Getting Started

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Run linting
bun run lint

# Fix linting issues
bun run lint:fix

# Generate TypeScript declarations
bun run types
```

## Project Structure

```
├── src/                    # Source code
│   ├── index.js           # Main entry point
│   ├── parse/             # Template parsing logic
│   │   ├── index.js       # Parser entry
│   │   ├── constants.js   # NodeType and operator constants
│   │   ├── utils.js       # Parser utilities
│   │   └── variables.js   # Variable/function parsing
│   ├── render.js          # AST rendering logic
│   ├── parseAndRender.js  # Convenience API
│   ├── errors.js          # Custom error classes
│   └── functions.js       # Built-in functions
├── spec/                  # YAML test specifications
│   ├── parse/            # Parser tests
│   ├── parseAndRender/   # Integration tests
│   └── render/           # Renderer tests
├── test/                  # Performance tests
│   └── performance/      # Performance profiling tools
├── docs/                  # Documentation
│   └── AST.md           # AST structure documentation
└── types/                # Generated TypeScript definitions (gitignored)
```

## JavaScript Conventions

### 1. Module System
- **ESM Only**: We use ES modules exclusively (`import`/`export`)
- Always include `.js` extension in imports
- Use named exports for utilities, default exports for main APIs

```javascript
// ✅ Good
import { NodeType } from "./constants.js";
export default parseAndRender;

// ❌ Bad
const { NodeType } = require("./constants");
module.exports = parseAndRender;
```

### 2. Functional Programming
- **No Classes**: Use functions and object literals instead of classes
- **Pure Functions**: Functions should have no side effects when possible
- **Immutability**: Avoid mutating data structures

```javascript
// ✅ Good - Pure function
const parseVariable = (expr) => {
  const trimmed = expr.trim();
  return { type: NodeType.VARIABLE, path: trimmed };
};

// ❌ Bad - Class-based
class VariableParser {
  parse(expr) {
    this.expr = expr.trim();
    return { type: NodeType.VARIABLE, path: this.expr };
  }
}
```

### 3. JSDoc Instead of TypeScript
- Use JSDoc comments for type annotations
- Generate TypeScript declarations from JSDoc using `bun run types`
- Types are especially important for public APIs

```javascript
/**
 * Parses a template and renders it with data
 * @param {Object} template - The template to parse
 * @param {Object} data - Data for variable substitution
 * @param {Object} [options] - Options object
 * @param {Object.<string, Function>} [options.functions] - Custom functions
 * @param {Object.<string, Object>} [options.partials] - Template partials
 * @returns {Object} The rendered output
 * @throws {JemplParseError} When template syntax is invalid
 */
const parseAndRender = (template, data, options = {}) => {
  // Implementation
};
```

### 4. Error Handling
- Use custom error classes (`JemplParseError`, `JemplRenderError`)
- Provide descriptive error messages with context
- Include examples of correct syntax in error messages

```javascript
// ✅ Good
throw new JemplParseError(
  `Invalid comparison operator '===' - did you mean '=='? (got: '${expr}')`
);

// ❌ Bad
throw new Error("Invalid operator");
```

### 5. Code Style
- **Prettier**: Code is automatically formatted using Prettier
- Configuration in `.prettierrc.yaml`:
  - Double quotes for strings
  - Semicolons required
  - Trailing commas
  - 2-space indentation
  - 80-character line width

### 6. Performance Considerations
- **Optimization Tiers**: The render engine uses multi-tier optimization
- **Hot Paths**: Keep frequently-executed code paths minimal
- **Benchmarks**: Performance tests must pass CI thresholds

## Testing

### Test Framework
- **Vitest**: Test runner (Bun-compatible)
- **Puty**: YAML-based test specifications for comprehensive test cases

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test performance.test.js

# Run tests matching pattern
bun test -t "should render loops"

# Update snapshots
bun test -u
```

### Writing Tests

1. **Unit Tests**: YAML specifications in `spec/` directory
2. **Performance Tests**: JavaScript tests in `test/performance.test.js`
3. **Integration Tests**: YAML specifications in `spec/parseAndRender/`

Example YAML test:
```yaml
template:
  name: "${user.name}"
  $if isAdmin:
    role: "admin"

cases:
  - data:
      user: { name: "John" }
      isAdmin: true
    output:
      name: "John"
      role: "admin"
```

## Performance

This codebase is highly optimized for performance:

- **Target**: Sub-millisecond rendering for common templates
- **Benchmarks**: See `PERFORMANCE.md` for detailed metrics
- **Profiling Tools**: Available in `test/performance/`

Key optimization strategies:
1. Nuclear pattern recognition for common templates
2. Aggressive inlining in hot paths
3. Minimal object allocations
4. Direct property access instead of path traversal

## Non-Obvious Design Choices

### 1. Two-Phase Processing (Parse + Render)
- **Parse Phase**: Heavy lifting done once at build time
- **Render Phase**: Minimal work for fastest runtime performance
- AST is designed for efficient rendering, not readability

### 2. No Dependencies
- Zero runtime dependencies for minimal bundle size
- All functionality implemented from scratch
- Only dev dependencies for testing and tooling

### 3. Backward Compatibility
- `render()` function maintains old API for functions parameter
- New API uses options object with `functions` and `partials`

### 4. Special Syntax Choices
- `$if`/`$else` instead of `{{#if}}` blocks for cleaner JSON
- `${variable}` syntax preserves types (not just strings)
- `$when` for conditional object inclusion vs `$if` for property merging

### 5. Error Message Philosophy
- Errors should teach correct syntax
- Include the problematic expression in error messages
- Suggest fixes when possible

## Contributing

1. **Performance First**: Changes must not regress performance benchmarks
2. **Test Coverage**: All features must have comprehensive test cases
3. **Documentation**: Update JSDoc comments and relevant .md files
4. **Compatibility**: Maintain backward compatibility when possible

## Debugging

```bash
# Run specific debug utilities
bun test/performance/debug-ast.js
bun test/performance/profile-bottlenecks.js
bun test/performance/deep-profile.js
```

## Common Tasks

### Adding a New Built-in Function
1. Add function to `src/functions.js`
2. Add test cases in `spec/parseAndRender/customFunctions.spec.yaml`
3. Update README.md documentation
4. Ensure function is pure and synchronous

### Optimizing a Template Pattern
1. Identify pattern in `src/render.js`
2. Add optimization in appropriate tier
3. Add performance test case
4. Verify improvement with benchmarks

### Adding a New Syntax Feature
1. Update parser in `src/parse/`
2. Add NodeType constant if needed
3. Update renderer in `src/render.js`
4. Add comprehensive test cases
5. Update README.md with examples
6. Consider performance impact

## Resources

- [AST Documentation](./docs/AST.md) - Understanding the AST structure
- [Performance Guide](./PERFORMANCE.md) - Detailed performance metrics
- [README](./README.md) - User-facing documentation
- [Test Specifications](./spec/) - Comprehensive test examples