# Jempl AST (Abstract Syntax Tree) Format

The AST is designed to be:

- Fast to traverse and render
- Easy to validate during parse phase
- Minimal memory footprint

## Core Principles

1. **Type Safety**: Each node has an explicit numeric type for fast switching
2. **Pre-validated**: All validation happens during parse phase
3. **Flat Structure**: Minimize nesting where possible for performance
4. **Memory Efficiency**: Compact representations and shared strings
5. **Fast Path Detection**: Mark objects/arrays without dynamic content for optimized rendering

## Node Type Constants

For performance, node types use numeric constants instead of strings:

```javascript
const NodeType = {
  LITERAL: 0,
  VARIABLE: 1,
  INTERPOLATION: 2,
  FUNCTION: 3,
  BINARY: 4,
  UNARY: 5,
  CONDITIONAL: 6,
  LOOP: 7,
  OBJECT: 8,
  ARRAY: 9,
  PARTIAL: 10,
  PATH_REFERENCE: 11,
};
```

## Node Types

### 1. Literal Node

For static values that don't require any processing.

```yaml
type: 0 # LITERAL
value: any # string, number, boolean, null, object, array
```

### 2. Variable Node

For variable replacements like `${name}` or `${user.profile.name}`.

```yaml
type: 1 # VARIABLE
path: string # "user.profile.name" - stored as string, split on demand
hint: string # optional: "string" | "number" | "boolean" | "array" | "object"
```

### 3. Interpolation Node

For string interpolation like `"Hello ${name}, you are ${age} years old"`.

```yaml
type: 2 # INTERPOLATION
parts: [string | Node]
# Array mixing strings and AST nodes (variables, functions, etc.)
# Example: ["Hello ", {type: 1, path: "name"}, ", you are ", {type: 1, path: "age"}, " years old"]
```

### 4. Function Call Node

For function invocations like `${now()}` or `${add(5, 3)}`.

```yaml
type: 3 # FUNCTION
name: string
args: [Node] # Arguments can be any node type
```

### 5. Binary Operation Node

For comparisons, logical operations, and arithmetic operations (in conditionals only).

```yaml
type: 4 # BINARY
op: 0..11 # Numeric operator codes: 0:==, 1:!=, 2:>, 3:<, 4:>=, 5:<=, 6:&&, 7:||, 8:in, 9:not used, 10:+, 11:-
left: Node
right: Node
```

**Note on arithmetic operators:**
- Operators `+` (10) and `-` (11) are only supported in conditional expressions
- Arithmetic operations require both operands to be numbers at runtime
- Left-to-right evaluation order for arithmetic expressions

### 6. Unary Operation Node

For negation operations like `!isAdult`.

```yaml
type: 5 # UNARY
op: 0 # 0:! (room for future operators)
operand: Node
```

### 7. Conditional Node

For `$if`, `$elif`, `$else` structures. These merge their content into the parent object.

```yaml
type: 6 # CONDITIONAL
conditions: [Node | null] # Flat array, null = else branch
bodies: [Node] # Corresponding bodies for each condition
id: string | null # For multiple conditionals like $if#1
```

**Note on $if vs $when:**
- `$if`: Merges the body content into the parent object when condition is true
- `$when`: Controls whether the entire object exists (stored as `whenCondition` on Object nodes)

**Functions and arithmetic in conditionals:**
- Conditions can contain function calls: `$if isEven(num):`
- Arithmetic operations are supported: `$if a + b > 10:`
- Functions can be used with arithmetic: `$if getValue() - 5 > threshold:`
- Nested function calls are allowed: `$if isPositive(calculate(x, y)):`

### 8. Loop Node

For `$for` structures.

```yaml
type: 7 # LOOP
itemVar: string # "p" in "$for p, i in people"
indexVar: string | null # "i" or null if not provided
iterable: Node # Variable or function that evaluates to array
body: Node # Template for each iteration
```

The `iterable` field can be:
- A variable node (type 1) for simple array references: `$for item in items`
- A function node (type 3) for function calls that return arrays: `$for item in sortDate(posts)`

Functions in loop iterables enable data transformation during iteration:
- `$for post in sortDate(posts):` - Sort array before iteration
- `$for item in filterBy(items, 'active', true):` - Filter array
- `$for item in take(sortBy(items, 'score'), 5):` - Nested functions

### 9. Object Node

For object templates.

```yaml
type: 8 # OBJECT
properties:
  - key: string
    value: Node
fast: boolean # true if no conditionals/loops/functions
whenCondition: Node | null # For $when directive (optional)
```

### 10. Array Node

For array templates.

```yaml
type: 9 # ARRAY
items: [Node]
fast: boolean # true if no conditionals/loops/functions
```

### 11. Partial Node

For partial template inclusion.

```yaml
type: 10 # PARTIAL
name: string # Name of the partial to include
data: Node | null # Optional inline data to pass to the partial
whenCondition: Node | null # Optional $when condition
```

### 12. Path Reference Node

For path references like `#{item}` or `#{product.id}` that resolve to the path of a loop variable.

```yaml
type: 11 # PATH_REFERENCE
path: string # "item" or "item.property" - must be a loop variable
```

**Note on path references:**
- Only valid within loops - references to loop variables only
- Resolves to the full path from root (e.g., `"categories[0].products[1]"`)
- Does not support functions, expressions, or array indices
- Used for data binding in UI frameworks that need paths rather than values

## Examples

### Example 1: Simple Variable Replacement

Template:

```yaml
name: "${firstName} ${lastName}"
age: "${age}"
```

AST:

```yaml
type: 8 # OBJECT
fast: true # No loops/conditionals/functions
properties:
  - key: name
    value:
      type: 2 # INTERPOLATION
      parts:
        - type: 1 # VARIABLE
          path: "firstName"
        - " "
        - type: 1 # VARIABLE
          path: "lastName"
  - key: age
    value:
      type: 1 # VARIABLE
      path: "age"
```

### Example 2: Conditional with Comparison

Template:

```yaml
$if age >= 18:
  status: "adult"
$else:
  status: "minor"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: "$if age >= 18"
    value:
      type: 6 # CONDITIONAL
      conditions:
        - type: 4 # BINARY
          op: 4 # >= operator
          left:
            type: 1 # VARIABLE
            path: "age"
          right:
            type: 0 # LITERAL
            value: 18
        - null # else branch
      bodies:
        - type: 8 # OBJECT
          fast: true
          properties:
            - key: status
              value:
                type: 0 # LITERAL
                value: "adult"
        - type: 8 # OBJECT
          fast: true
          properties:
            - key: status
              value:
                type: 0 # LITERAL
                value: "minor"
      id: null
```

### Example 3: Loop with Variable Iterable

Template:

```yaml
users:
  $for user, idx in users:
    name: "${uppercase(user.name)}"
    index: "${idx}"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: users
    value:
      type: 8 # OBJECT
      fast: false
      properties:
        - key: "$for user, idx in users"
          value:
            type: 7 # LOOP
            itemVar: user
            indexVar: idx
            iterable:
              type: 1 # VARIABLE
              path: "users"
            body:
              type: 8 # OBJECT
              fast: false
              properties:
                - key: name
                  value:
                    type: 3 # FUNCTION
                    name: uppercase
                    args:
                      - type: 1 # VARIABLE
                        path: "user.name"
                - key: index
                  value:
                    type: 1 # VARIABLE
                    path: "idx"
```

### Example 4: Loop with Function Iterable

Template:

```yaml
posts:
  $for post in sortDate(blogPosts):
    - title: "${post.title}"
      date: "${post.date}"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: posts
    value:
      type: 8 # OBJECT
      fast: false
      properties:
        - key: "$for post in sortDate(blogPosts)"
          value:
            type: 7 # LOOP
            itemVar: post
            indexVar: null
            iterable:
              type: 3 # FUNCTION
              name: "sortDate"
              args:
                - type: 1 # VARIABLE
                  path: "blogPosts"
            body:
              type: 9 # ARRAY
              fast: true
              items:
                - type: 8 # OBJECT
                  fast: true
                  properties:
                    - key: title
                      value:
                        type: 1 # VARIABLE
                        path: "post.title"
                    - key: date
                      value:
                        type: 1 # VARIABLE
                        path: "post.date"
```

Note how the `iterable` field contains a function node (type 3) instead of a variable node (type 1). This allows functions to transform arrays before iteration.

### Example 5: Loop with Nested Functions

Template:

```yaml
topItems:
  $for item, i in take(sortBy(items, 'score'), 5):
    - rank: "${i + 1}"
      name: "${item.name}"
      score: "${item.score}"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: topItems
    value:
      type: 8 # OBJECT
      fast: false
      properties:
        - key: "$for item, i in take(sortBy(items, 'score'), 5)"
          value:
            type: 7 # LOOP
            itemVar: item
            indexVar: i
            iterable:
              type: 3 # FUNCTION
              name: "take"
              args:
                - type: 3 # FUNCTION
                  name: "sortBy"
                  args:
                    - type: 1 # VARIABLE
                      path: "items"
                    - type: 0 # LITERAL
                      value: "score"
                - type: 0 # LITERAL
                  value: 5
            body:
              type: 9 # ARRAY
              fast: false
              items:
                - type: 8 # OBJECT
                  fast: false
                  properties:
                    - key: rank
                      value:
                        type: 2 # INTERPOLATION
                        parts:
                          - type: 4 # BINARY
                            op: 10 # + operator
                            left:
                              type: 1 # VARIABLE
                              path: "i"
                            right:
                              type: 0 # LITERAL
                              value: 1
                    - key: name
                      value:
                        type: 1 # VARIABLE
                        path: "item.name"
                    - key: score
                      value:
                        type: 1 # VARIABLE
                        path: "item.score"
```

This example shows how nested function calls are represented in the AST, with the inner function (`sortBy`) as an argument to the outer function (`take`).

### Example 6: When Directive

The `$when` directive controls whether an entire object exists in the output. Like `$if`, it supports functions and arithmetic operations.

Template:

```yaml
$when: isActive
type: "button"
label: "Click me"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
whenCondition:
  type: 1 # VARIABLE
  path: "isActive"
properties:
  - key: type
    value:
      type: 0 # LITERAL
      value: "button"
  - key: label
    value:
      type: 0 # LITERAL
      value: "Click me"
```

### Example 5: When with Complex Condition

Template:

```yaml
$when: isLoggedIn && (isAdmin || isOwner)
dashboard: "Full Access"
settings: "Edit All"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
whenCondition:
  type: 4 # BINARY
  op: 6 # && operator
  left:
    type: 1 # VARIABLE
    path: "isLoggedIn"
  right:
    type: 4 # BINARY
    op: 7 # || operator
    left:
      type: 1 # VARIABLE
      path: "isAdmin"
    right:
      type: 1 # VARIABLE
      path: "isOwner"
properties:
  - key: dashboard
    value:
      type: 0 # LITERAL
      value: "Full Access"
  - key: settings
    value:
      type: 0 # LITERAL
      value: "Edit All"
```

### Example 6: When in Arrays

Template:

```yaml
items:
  - $when: showFirst
    id: 1
    name: "First"
  - $when: showSecond
    id: 2
    name: "Second"
  - id: 3
    name: "Always"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: items
    value:
      type: 9 # ARRAY
      fast: false
      items:
        - type: 8 # OBJECT
          fast: false
          whenCondition:
            type: 1 # VARIABLE
            path: "showFirst"
          properties:
            - key: id
              value:
                type: 0 # LITERAL
                value: 1
            - key: name
              value:
                type: 0 # LITERAL
                value: "First"
        - type: 8 # OBJECT
          fast: false
          whenCondition:
            type: 1 # VARIABLE
            path: "showSecond"
          properties:
            - key: id
              value:
                type: 0 # LITERAL
                value: 2
            - key: name
              value:
                type: 0 # LITERAL
                value: "Second"
        - type: 8 # OBJECT
          fast: true
          whenCondition: null
          properties:
            - key: id
              value:
                type: 0 # LITERAL
                value: 3
            - key: name
              value:
                type: 0 # LITERAL
                value: "Always"
```

### Example 7: Conditional with Function Call

Template:

```yaml
$if isEven(count):
  parity: "even"
$else:
  parity: "odd"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: "$if isEven(count)"
    value:
      type: 6 # CONDITIONAL
      conditions:
        - type: 3 # FUNCTION
          name: "isEven"
          args:
            - type: 1 # VARIABLE
              path: "count"
        - null # else branch
      bodies:
        - type: 8 # OBJECT
          fast: true
          properties:
            - key: parity
              value:
                type: 0 # LITERAL
                value: "even"
        - type: 8 # OBJECT
          fast: true
          properties:
            - key: parity
              value:
                type: 0 # LITERAL
                value: "odd"
      id: null
```

### Example 8: Conditional with Arithmetic

Template:

```yaml
$if score + bonus - penalty > 100:
  status: "high achiever"
$elif score + bonus > 50:
  status: "above average"
$else:
  status: "needs improvement"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: "$if score + bonus - penalty > 100"
    value:
      type: 6 # CONDITIONAL
      conditions:
        - type: 4 # BINARY
          op: 2 # > operator
          left:
            type: 4 # BINARY
            op: 11 # - operator
            left:
              type: 4 # BINARY
              op: 10 # + operator
              left:
                type: 1 # VARIABLE
                path: "score"
              right:
                type: 1 # VARIABLE
                path: "bonus"
            right:
              type: 1 # VARIABLE
              path: "penalty"
          right:
            type: 0 # LITERAL
            value: 100
        - type: 4 # BINARY
          op: 2 # > operator
          left:
            type: 4 # BINARY
            op: 10 # + operator
            left:
              type: 1 # VARIABLE
              path: "score"
            right:
              type: 1 # VARIABLE
              path: "bonus"
          right:
            type: 0 # LITERAL
            value: 50
        - null # else branch
      bodies:
        - type: 8 # OBJECT
          fast: true
          properties:
            - key: status
              value:
                type: 0 # LITERAL
                value: "high achiever"
        - type: 8 # OBJECT
          fast: true
          properties:
            - key: status
              value:
                type: 0 # LITERAL
                value: "above average"
        - type: 8 # OBJECT
          fast: true
          properties:
            - key: status
              value:
                type: 0 # LITERAL
                value: "needs improvement"
      id: null
```

### Example 9: Path References in Loops

Template:

```yaml
products:
  $for product in products:
    - binding: "#{product}"
      name: "${product.name}"
      pricePath: "#{product.price}"
```

AST:

```yaml
type: 8 # OBJECT
fast: false
properties:
  - key: products
    value:
      type: 8 # OBJECT
      fast: false
      properties:
        - key: "$for product in products"
          value:
            type: 7 # LOOP
            itemVar: "product"
            indexVar: null
            iterable:
              type: 1 # VARIABLE
              path: "products"
            body:
              type: 9 # ARRAY
              fast: true
              items:
                - type: 8 # OBJECT
                  fast: true
                  properties:
                    - key: binding
                      value:
                        type: 11 # PATH_REFERENCE
                        path: "product"
                    - key: name
                      value:
                        type: 1 # VARIABLE
                        path: "product.name"
                    - key: pricePath
                      value:
                        type: 11 # PATH_REFERENCE
                        path: "product.price"
```

When rendered with `products: [{name: "Widget", price: 99.99}, {name: "Gadget", price: 49.99}]`:

```yaml
products:
  - binding: "products[0]"
    name: "Widget"
    pricePath: "products[0].price"
  - binding: "products[1]"
    name: "Gadget"
    pricePath: "products[1].price"
```

## Optimizations

1. **Constant Folding**: During parse, evaluate constant expressions
2. **String Paths**: Store paths as strings, split only when needed
3. **Type Hints**: Optional hints on variables for better optimization
4. **Fast Path Detection**: Mark objects/arrays without conditionals, loops, or functions as `fast: true`
5. **Numeric Types**: Use integers instead of strings for faster switching
6. **Interpolation**: Efficient representation mixing strings and AST nodes

## Error Handling

The AST structure supports clear error messages during parsing and rendering phases:

```
Parse Error: Invalid variable syntax (got: '${user.}')
Render Error: Variable 'username' is not defined in the provided data
```

Error handling focuses on:

- Clear, descriptive messages
- Validation during parse phase to catch syntax errors early
- Render validation for data-related issues
- No performance impact from error tracking structures
