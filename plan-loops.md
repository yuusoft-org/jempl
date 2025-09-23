# Plan: Mixed Arrays with Loops

## Problem Statement

Currently, when using `$for` loops inside arrays, the loop results are wrapped as a nested array instead of being flattened into the parent array. This prevents mixing static items with dynamically generated items at the same level.

### Current Behavior
```yaml
children:
  - id: 'static-1'
  - $for item in items:
      id: '${item.id}'
  - id: 'static-2'

# Results in:
children:
  - { id: 'static-1' }
  - [ { id: '1' }, { id: '2' } ]  # Loop results as nested array
  - { id: 'static-2' }
```

### Desired Behavior
```yaml
children:
  - id: 'static-1'
  - $for item in items:
      id: '${item.id}'
  - id: 'static-2'

# Should result in:
children:
  - { id: 'static-1' }
  - { id: '1' }         # Loop results flattened
  - { id: '2' }         # into parent array
  - { id: 'static-2' }
```

## Solution: Flatten by Default with Modifier for Nested

### Overview
- `$for` loops in arrays will **flatten by default** (most common use case)
- Use `$for:nested` modifier to preserve current nesting behavior when needed
- **IMPORTANT**: `$for` must be a direct array item, not an object property

### Syntax Rules

#### Valid: `$for` as Array Item
```yaml
# CORRECT - $for is a direct array item
items:
  - $for item in data:
      id: '${item.id}'
```

#### Invalid: `$for` as Object Property
```yaml
# INCORRECT - Will be rejected
items:
  - content:
      $for item in data:    # ERROR: $for cannot be an object property
        id: '${item.id}'
```

#### Currently Problematic (But Exists)
```yaml
# This syntax currently works but is confusing and should be deprecated
content:
  $for item in items:    # Loop as object property directly returns array
    - id: '${item.id}'
    
# It currently produces:
content: [
  { id: '1' },
  { id: '2' }
]

# This should be written as:
content:
  - $for item in items:  # Loop inside array
      id: '${item.id}'
```

### Syntax Examples

#### Default Behavior (Flattened)
```yaml
# Common use case - mixing static and dynamic items
children:
  - id: 'static-1'
  - $for item in items:
      id: '${item.id}'
  - id: 'static-2'

# With items = [{id: 'dynamic-1'}, {id: 'dynamic-2'}]
# Results in flat array:
children:
  - { id: 'static-1' }
  - { id: 'dynamic-1' }    # Flattened
  - { id: 'dynamic-2' }    # Flattened
  - { id: 'static-2' }
```

#### Explicit Nested Array (Same Example)
```yaml
# Using :nested modifier to preserve current behavior
children:
  - id: 'static-1'
  - $for:nested item in items:
      id: '${item.id}'
  - id: 'static-2'

# With items = [{id: 'dynamic-1'}, {id: 'dynamic-2'}]
# Results in nested array:
children:
  - { id: 'static-1' }
  - [                      # Nested array
      { id: 'dynamic-1' },
      { id: 'dynamic-2' }
    ]
  - { id: 'static-2' }
```

#### Complex Nested Arrays
```yaml
# When you need nested arrays for grouping
matrix:
  - title: 'Groups'
  - $for:nested group in groups:
      $for item in group.items:
        id: '${item.id}'
        name: '${item.name}'

# Results in nested structure:
matrix:
  - { title: 'Groups' }
  - [  # First group's items
      { id: '1-1', name: 'Item A' },
      { id: '1-2', name: 'Item B' }
    ]
  - [  # Second group's items
      { id: '2-1', name: 'Item C' },
      { id: '2-2', name: 'Item D' }
    ]
```

### Implementation Details

#### 1. Parse Phase
Update loop parsing to:
- Detect and store the modifier
- Validate that `$for` is only used as array item

```javascript
// In parseObject - reject $for as property
if (key.startsWith('$for ')) {
  throw new JemplParseError(
    `$for cannot be used as an object property. ` +
    `It must be a direct array item. ` +
    `Found: "${key}"`
  );
}

// In parseArray - detect $for:nested modifier
const forPattern = /^\$for(?::(\w+))?\s+(.+)$/;
const [, modifier, loopExpr] = key.match(forPattern);

// Store in AST node
{
  type: NodeType.LOOP,
  flatten: modifier !== 'nested',  // default true
  itemVar: 'item',
  indexVar: 'i',
  // ...
}
```

#### 2. Render Phase
Update `renderArray` to respect the flatten flag:
```javascript
if (item.type === NodeType.LOOP) {
  const loopResults = renderNode(item, options, data, scope);
  if (Array.isArray(loopResults) && item.flatten !== false) {
    results.push(...loopResults);  // Flatten (default)
  } else {
    results.push(loopResults);      // Keep nested
  }
}
```

### Benefits

1. **Intuitive Default** - Flattening is what most users expect
2. **Backward Compatible Path** - Existing code can add `:nested` to preserve behavior
3. **Explicit Intent** - Clear when nesting is desired vs accidental
4. **Consistent Syntax** - Follows Jempl's modifier pattern (like `$if#2`)
5. **Performance** - No runtime detection overhead

### Why This Breaking Change Is Worth It

1. **Single, Clear Mental Model** - No confusion about when arrays are flattened vs nested
2. **Prevents Bugs** - Mixed behaviors lead to unexpected results
3. **Better Long-term** - Supporting two different behaviors increases complexity forever
4. **Most Common Case Becomes Default** - Flattening is what users usually want
5. **Explicit is Better** - When nesting is needed, it's clearly marked with `:nested`

### Migration Strategy

**Direct to Version 2.0 (Major Release)**
- Make this a clean break - no gradual migration
- Every `$for` in arrays must be updated to either:
  - Work with flattening (most cases)
  - Add `:nested` modifier (when nesting is required)
- Provide clear migration guide and examples
- Consider a codemod/migration script to help users

### Migration Impact

**Who needs to update:**
- Every template with `$for` loops inside arrays
- No impact on `$for` loops in objects or at root level

**Update required:**
```yaml
# Before (v1.x)
items:
  - $for item in data:
      name: '${item.name}'

# After (v2.0) - choose one:
# Option 1: Embrace flattening (recommended)
items:
  - $for item in data:
      name: '${item.name}'

# Option 2: Preserve nesting (if needed)
items:
  - $for:nested item in data:
      name: '${item.name}'
```

### Examples of Use Cases

#### UI Component Lists (Flatten Preferred)
```yaml
menuItems:
  - label: 'Home'
    path: '/'
  - $for page in dynamicPages:
      label: '${page.title}'
      path: '${page.url}'
  - label: 'Contact'
    path: '/contact'
```

#### Data Transformation (Nesting Sometimes Needed)
```yaml
report:
  - summary: 'Total groups: ${groups.length}'
  - $for:nested group in groups:
      $for stat in group.statistics:
        value: '${stat.value}'
        label: '${stat.label}'
```

### Alternative Modifiers Considered

- `$for:nested` - **Chosen** - Clear intent
- `$for:noflat` - Double negative, less clear
- `$for:array` - Less obvious what it does
- `$for#nested` - Could work but `:` is more consistent

### Error Messages

When `$for` is misused as an object property:
```
Parse Error: $for cannot be used as an object property. It must be a direct array item.
Found: "$for item in items"

Correct usage:
  items:
    - $for item in data:
        id: '${item.id}'

Incorrect usage:
  items:
    - content:
        $for item in data:  # This is not allowed
          id: '${item.id}'
```

## Implementation Steps

1. Update `parseObject` in `src/parse/utils.js` to reject `$for` as property key
2. Update `parseLoop` in `src/parse/utils.js` to detect `:nested` modifier
3. Add `flatten` property to loop AST nodes (default `true`)
4. Update `renderArray` in `src/render.js` to check `flatten` flag
5. Update ALL existing tests that use `$for` in arrays
6. Add new tests for:
   - Both flattened and nested behaviors
   - Error case when `$for` is used as object property
   - Migration scenarios
7. Update README.md with:
   - Breaking change notice at the top
   - New loop behavior documentation
   - Migration guide section
8. Create MIGRATION.md with detailed examples
9. Update version to 2.0.0 in package.json

## Key Decision: Clean Break

Rather than supporting two different ways indefinitely, we're making a clean break:
- **Clear semantics**: `$for` in arrays always flattens unless explicitly marked `:nested`
- **No legacy mode**: No flags or compatibility options
- **Worth the disruption**: Better to have one clear way forward than maintain confusion forever