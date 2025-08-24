# Path Reference Syntax Analysis for Jempl

## Executive Summary

**Yes, the path reference syntax `#{}` feature can be implemented** in Jempl. The implementation is feasible because:

1. The template engine already tracks loop variables through a scope mechanism
2. The parsing infrastructure supports new syntax patterns  
3. The rendering engine maintains context needed to reconstruct paths
4. The feature aligns well with the existing architecture

## Feature Overview

The proposed `#{}` syntax would resolve to the path of a variable rather than its value:

```yaml
# Template
$for category, i in categories:
  $for product, j in category.products:
    - div .product=#{product}: ${product.name}

# Result  
- div .product=categories[0].products[0]: Widget
- div .product=categories[0].products[1]: Gadget
- div .product=categories[1].products[0]: Gizmo
```

## Technical Analysis

### Current Architecture

1. **Parsing Phase**: 
   - Loop syntax is parsed into AST nodes with `itemVar` and `indexVar`
   - Variables are parsed as `NodeType.VARIABLE` with a path property
   - The parser already supports multiple syntax patterns (`${}`, `$if`, `$for`, etc.)

2. **Rendering Phase**:
   - Loop variables are stored in a `scope` object during iteration
   - The scope tracks: `{ [itemVar]: currentItem, [indexVar]: currentIndex }`
   - Variable resolution checks scope first, then falls back to data

### Implementation Requirements

To implement `#{}` syntax, we need:

1. **New Parser Logic**:
   - Detect `#{variable}` pattern (similar to existing `${variable}` detection)
   - Create a new node type: `NodeType.PATH_REFERENCE`
   - Validate that the variable exists in loop scope (not in global data)

2. **Enhanced Scope Tracking**:
   - Extend scope to track the full path to each loop variable
   - Store: `{ [itemVar]: { value: item, path: "categories[0]" } }`
   - Handle nested loops by building paths incrementally

3. **New Rendering Logic**:
   - Render `PATH_REFERENCE` nodes by retrieving the path from scope
   - Support property access: `#{item.id}` → `"items[0].id"`

## Implementation Plan

### Phase 1: Parser Extension

1. **Add PATH_REFERENCE_REGEX** in `src/parse/variables.js`:
   ```javascript
   const PATH_REFERENCE_REGEX = /#\{([^}]*)\}/g;
   ```

2. **Create parsePathReference function**:
   - Similar to `parseVariable` but returns `NodeType.PATH_REFERENCE`
   - Validate the expression doesn't contain functions or complex logic

3. **Update parseStringValue** to handle `#{}`:
   - Check for path references alongside variable replacements
   - Handle escaping: `\#{` for literal output

### Phase 2: Scope Enhancement

1. **Modify loop rendering** in `src/render.js`:
   ```javascript
   // Current scope:
   const loopScope = {
     ...scope,
     [itemVar]: item,
     [indexVar]: i
   };

   // Enhanced scope with paths:
   const loopScope = {
     ...scope,
     [itemVar]: item,
     [indexVar]: i,
     __paths__: {
       ...scope.__paths__,
       [itemVar]: `${iterablePath}[${i}]`,
       [indexVar]: i
     }
   };
   ```

2. **Track nested paths**:
   - Build paths incrementally as we enter nested loops
   - Handle both array indices and property access

### Phase 3: Rendering Implementation

1. **Add renderPathReference function**:
   ```javascript
   const renderPathReference = (node, options, data, scope) => {
     const { path } = node;
     
     // Check if it's a loop variable
     if (!scope.__paths__ || !(path in scope.__paths__)) {
       throw new JemplRenderError(
         `Path reference '#{${path}}' is not a loop variable`
       );
     }
     
     // Handle property access
     if (path.includes('.')) {
       const [base, ...props] = path.split('.');
       const basePath = scope.__paths__[base];
       return `${basePath}.${props.join('.')}`;
     }
     
     return scope.__paths__[path];
   };
   ```

2. **Update renderNode** to handle `PATH_REFERENCE` type

### Phase 4: Testing & Optimization

1. **Add comprehensive test cases**:
   - Simple loops with path references
   - Nested loops
   - Property access (`#{item.id}`)
   - Error cases (non-loop variables)
   - Escaping

2. **Performance optimization**:
   - Cache path computations
   - Add fast paths for common patterns
   - Ensure minimal overhead when not using `#{}`

## Design Decisions

### Why Only Loop Variables?

Restricting `#{}` to loop variables makes sense because:
- Global data paths are static and known at template time
- Loop variable paths are dynamic and change with each iteration
- This avoids confusion and makes the feature's purpose clear

### Syntax Choice

The `#{}` syntax is appropriate because:
- Familiar to developers (CSS selectors, URL fragments)
- Visually distinct from `${}` for values
- Non-breaking addition to the language

### Error Handling

Clear error messages for:
- Using `#{}` with non-loop variables
- Using `#{}` with undefined variables
- Invalid property access patterns

## Implementation Timeline

1. **Week 1**: Parser implementation and basic rendering
2. **Week 2**: Nested loops and property access support
3. **Week 3**: Error handling and edge cases
4. **Week 4**: Performance optimization and documentation

## Risks and Mitigations

1. **Performance Impact**: 
   - Risk: Tracking paths adds overhead
   - Mitigation: Only track paths when `#{}` is used in template

2. **Complexity**: 
   - Risk: Scope management becomes more complex
   - Mitigation: Clean separation of concerns, thorough testing

3. **Breaking Changes**: 
   - Risk: None - this is an additive feature
   - Mitigation: Ensure `#{}` parsing doesn't affect existing templates

## Conclusion

The path reference syntax feature is well-suited to Jempl's architecture and can be implemented without major changes to the core engine. The implementation would:

- Provide significant developer experience improvements
- Maintain backward compatibility
- Align with Jempl's performance goals
- Follow established patterns in the codebase

I recommend proceeding with the implementation following the phased approach outlined above.