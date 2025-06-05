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

For comparisons and logical operations.

```yaml
type: 4 # BINARY
op: 0..8 # Numeric operator codes: 0:==, 1:!=, 2:>, 3:<, 4:>=, 5:<=, 6:&&, 7:||, 8:in
left: Node
right: Node
```

### 6. Unary Operation Node

For negation operations like `!isAdult`.

```yaml
type: 5 # UNARY
op: 0 # 0:! (room for future operators)
operand: Node
```

### 7. Conditional Node

For `$if`, `$elif`, `$else` structures.

```yaml
type: 6 # CONDITIONAL
conditions: [Node | null] # Flat array, null = else branch
bodies: [Node] # Corresponding bodies for each condition
id: string | null # For multiple conditionals like $if#1
```

### 8. Loop Node

For `$for` structures.

```yaml
type: 7 # LOOP
itemVar: string # "p" in "$for p, i in people"
indexVar: string | null # "i" or null if not provided
iterable: Node # Variable or expression that evaluates to array
body: Node # Template for each iteration
```

### 9. Object Node

For object templates.

```yaml
type: 8 # OBJECT
properties:
  - key: string
    value: Node
fast: boolean # true if no conditionals/loops/functions
```

### 10. Array Node

For array templates.

```yaml
type: 9 # ARRAY
items: [Node]
fast: boolean # true if no conditionals/loops/functions
```

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

### Example 3: Loop with Function Call

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
