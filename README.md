# Jempl

[![npm version](https://badge.fury.io/js/jempl.svg)](https://www.npmjs.com/package/jempl)

Jempl is a JSON templating engine with conditionals, loops, and custom functions.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
  - [Variable Replacement](#variable-replacement)
  - [Conditionals](#conditionals)
  - [Loops](#loops)
  - [Custom Functions](#custom-functions)
  - [Escaping](#escaping)
- [Alternative Libraries](#alternative-libraries)

## Installation

```bash
npm install jempl
```

## Quick Start

```javascript
import { parseAndRender } from 'jempl';

const template = {
  name: "${user.name}",
  greeting: "Hello ${user.name}!",
  $if user.age >= 18:
    status: "adult"
  $else:
    status: "minor"
};

const data = {
  user: { name: "John", age: 25 }
};

const result = parseAndRender(template, data);
// Output: { name: "John", greeting: "Hello John!", status: "adult" }
```

## Objectives

- Small and simple API surface
- Fast and performant
- User friendly error codes and messages
- Custom functions

## Parse and Render

There is a Parse and Render phase

**Let:**

$D$ - Data

$T$ - Template

$F$ - Custom Functions

$A$ - AST (Abstract Syntax Tree)

$R$ - Result

**Then:**

$A = \mathtt{Parse}(T, F)$ - Parse template with functions to create AST

$R = \mathtt{Render}(A, D, F)$ - Render AST with data and functions

**Or by composition:**

$R = \mathtt{Render}(\mathtt{Parse}(T, F), D, F)$ - Parse and render in one step

During `Parse` phase, the objective is to do all the performance critical work and validation. `Parse` only makes use of `Custom Functions` for validation purpose. This should be done at build time. The `AST` should require minimal time to be rendered.

During `Render` phase, the objective is to do the actual rendering. This should be done at runtime, and should be as fast as possible.

For more details about the AST structure, see [AST Documentation](./docs/AST.md).

# Features

- Variable Replacement
- Conditionals
- Loops
- Custom Functions
- Escaping
- Error Handling

## Variable Replacement

### Basic Syntax

Variables are referenced using `${variableName}` syntax. The library preserves the original data type when replacing standalone variables.

Notice that

- When a variable is the entire value (e.g., `age: "${age}"`), the original type is preserved
- When a variable is part of a string (e.g., `"I am ${age} years old"`), it's converted to string
- Nested properties work like lodash get notation
- Variables can also be used in object keys (e.g., `"input placeholder=\"${placeholderText}\"":`)

### Special Characters in Variable Names

Variable names support various special characters:

- **Hyphens**: `${user-name}`
- **Colons**: `${user:id}`
- **At symbols**: `${user@email}`
- **Array indexing**: `${items[0]}`
- **Nested properties**: `${user.profile.name}`

Note: Variables with parentheses like `${func()}` are parsed as function calls, not variables.

```yaml
template:
  fullName: "${fullName.firstName} ${fullName.lastName}"
  age: "${age}"
  city: "I live in ${city}"
  isAdult: ${isAdult}
  firstHobby: "${hobbies[0]}"
  allHobbies: "${hobbies}"
  input placeholder="${placeholderText}":

cases:
  - data:
      fullName:
        firstName: "John"
        lastName: "Doe"
      age: 30
      city: "New York"
      isAdult: true
      hobbies: ["reading", "writing", "coding"]
      placeholderText: "Enter your name"

    output:
      fullName: "John Doe"
      age: 30
      city: "I live in New York"
      isAdult: true
      firstHobby: "reading"
      allHobbies: ["reading", "writing", "coding"]
      input placeholder="Enter your name":
```

## Conditionals

### Basic

When a conditional evaluates to true, its properties are merged directly into the parent object. The key insight is that `$if`, `$elif`, and `$else` are special keys that get evaluated and removed during processing.

```yaml
template:
  name: "${name}"
  $if isAdult:
    welcome: "You are an adult"
  $elif age > 60:
    welcome: "You are too old"
  $else:
    welcome: "You are too young"

cases:
  - data:
      name: "John"
      age: 30
      isAdult: true
    output:
      name: "John"
      welcome: "You are an adult"
```

### Multiple Conditionals

in case we want to have more than one conditional, we can use the `#1` syntax, it works as long as property name is unique.

```yaml
template:
  name: "${name}"
  $if#1 isAdult:
    welcome: "You are an adult"
  $elif#1 age > 60:
    welcome: "You are too old"
  $else#1:
    welcome: "You are too young"

  $if#2 isAdult:
    welcome2: "You are an adult"
  $elif#2 age > 60:
    welcome2: "You are too old"
  $else#2:
    welcome2: "You are too young"

cases:
  - data:
      name: "John"
      age: 30
      isAdult: true
    output:
      name: "John"
      welcome: "You are an adult"
      welcome2: "You are an adult"
```

### Nested conditionals

```yaml
template:
  name: "${name}"
  $if isAdult:
    $if age > 60:
      welcome: "You are too old"
    $else:
      welcome: "You are too young"

cases:
  - data:
      name: "John"
      age: 30
      isAdult: true
    output:
      name: "John"
      welcome: "You are too young"
  - data:
      name: "John"
      age: 70
      isAdult: false
    output:
      name: "John"
```

### Supported Operators

#### Comparison Operators

- `==` - Equal to
- `!=` - Not equal to
- `>` - Greater than
- `>=` - Greater than or equal to
- `<` - Less than
- `<=` - Less than or equal to
- `in` - Array/string contains value

#### Logical Operators

- `&&` - Logical AND
- `||` - Logical OR
- `!` - Logical NOT (negation)

#### Examples

```yaml
template:
  name: "${name}"

  # Equality and inequality
  $if name == "John":
    welcome1: "You are John"
  $if name != "John":
    welcome2: "You are not John"

  # Numeric comparisons
  $if age == 30:
    welcome3: "You are exactly 30"
  $if age >= 18:
    welcome4: "You are an adult"
  $if age > 65:
    welcome5: "You are a senior"
  $if age < 18:
    welcome6: "You are a minor"
  $if age <= 12:
    welcome7: "You are a child"

  # Boolean operations
  $if isAdult:
    welcome8: "You are an adult"
  $if !isAdult:
    welcome9: "You are not an adult"

  # Array/string membership
  $if "reading" in hobbies:
    welcome10: "You like reading"
  $if "o" in name:
    welcome11: "Your name contains 'o'"

  # Logical combinations
  $if name == "John" && age >= 18:
    welcome12: "You are adult John"
  $if age < 18 || age > 65:
    welcome13: "You get a discount"

cases:
  - data:
      name: "John"
      age: 30
      isAdult: true
      hobbies: ["reading", "writing"]
    output:
      name: "John"
      welcome1: "You are John"
      welcome3: "You are exactly 30"
      welcome4: "You are an adult"
      welcome8: "You are an adult"
      welcome10: "You like reading"
      welcome11: "Your name contains 'o'"
      welcome12: "You are adult John"
```

## Loops

Looping through arrays

```yaml
data:
  people:
    - name: "John"
      age: 30
    - name: "May"
      age: 20
    - name: "June"
      age: 10

template:
  people:
    $for p, i in people:
      - name: "${p.name}"
        age: "${p.age}"
        index: "${i}"

output:
  people:
    - name: "John"
      age: 30
      index: 0
    - name: "May"
      age: 20
      index: 1
    - name: "June"
      age: 10
      index: 2
```

## Escaping

To output literal `${` in strings, use `\${`:

```yaml
data:
  price: 100

template:
  message: "The price is \\${price} (literal)"
  actual: "The actual price is ${price}"
  doubleEscape: "Backslash and variable: \\\\${price}"

output:
  message: "The price is ${price} (literal)"
  actual: "The actual price is 100"
  doubleEscape: "Backslash and variable: \\100"
```

## Functions

### Function vs Variable Parsing

The parser distinguishes between functions and variables based on parentheses:

- `${variableName}` - Parsed as a variable reference
- `${functionName()}` - Parsed as a function call (even with no arguments)
- `${add(5, 3)}` - Parsed as a function call with arguments

### Built-in Functions

Jempl includes one built-in function:

```yaml
template:
  timestamp: "${now()}"
  message: "Generated at ${now()}"

output:
  timestamp: 1640995200000
  message: "Generated at 1640995200000"
```

**Available Built-in Function:**

- `now()` - Returns current timestamp in milliseconds

## Custom Functions

### Overview

Custom functions provide an escape hatch for advanced use cases while maintaining security and performance.

The library comes with built-in functions and allows registering custom ones.

Functions can return any JSON-serializable value, including objects and arrays.

### Usage in Templates

Custom functions can be passed to the template engine and used in expressions:

```javascript
import { parseAndRender } from "jempl";

const customFunctions = {
  add: (a, b) => Number(a) + Number(b),
  multiply: (a, b) => Number(a) * Number(b),
  uppercase: (str) => String(str).toUpperCase(),
  capitalize: (str) => {
    const s = String(str);
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  },
};

const template = {
  sum: "${add(10, 20)}",
  greeting: "Hello ${capitalize(name)}!",
  result: "${multiply(add(a, b), c)}",
};

const data = { name: "john", a: 5, b: 3, c: 2 };

const result = parseAndRender(template, data, customFunctions);
// Output: { sum: 30, greeting: "Hello John!", result: 16 }
```

### Functions Returning Objects

Functions can return complex data structures including objects and arrays:

```javascript
const customFunctions = {
  createUser: (name, age) => ({
    name: String(name),
    age: Number(age),
    isAdult: Number(age) >= 18,
    metadata: {
      createdAt: Date.now(),
      version: 1,
    },
  }),

  getStats: (items) => ({
    count: Array.isArray(items) ? items.length : 0,
    isEmpty: !Array.isArray(items) || items.length === 0,
    summary: `${Array.isArray(items) ? items.length : 0} items`,
  }),
};
```

```yaml
template:
  user: "${createUser(name, age)}"
  stats: "${getStats(hobbies)}"
  profile:
    info: "${createUser(firstName, userAge)}"
    activity: "${getStats(activities)}"

data:
  name: "Alice"
  age: 25
  firstName: "Bob"
  userAge: 17
  hobbies: ["reading", "coding"]
  activities: []

output:
  user:
    name: "Alice"
    age: 25
    isAdult: true
    metadata:
      createdAt: 1640995200000
      version: 1
  stats:
    count: 2
    isEmpty: false
    summary: "2 items"
  profile:
    info:
      name: "Bob"
      age: 17
      isAdult: false
      metadata:
        createdAt: 1640995200000
        version: 1
    activity:
      count: 0
      isEmpty: true
      summary: "0 items"
```

When a function returns an object or array, it replaces the entire template value. This allows you to dynamically generate complex nested structures based on your data and logic.

### Function Constraints

1. **Pure Functions Only**: Functions must be pure (no side effects)
2. **Synchronous**: No async/await or promises allowed
3. **Return Values**: Must return JSON-serializable values (primitives, objects, arrays)
4. **No External Access**: Cannot access global scope or external variables
5. **Timeout Protection**: Functions that run too long will be terminated
6. **Deterministic**: Built-in functions like `now()` and `random()` can be made deterministic via options for testing

### Nested Function Calls

Functions can be nested and combined with other expressions:

```yaml
template:
  # Nested function calls
  formatted: "${formatDate(parseDate(dateString), 'YYYY-MM-DD')}"
```

### Error Handling

The library will try to throw errors whenever an invalid expression is encountered.
The library will try to give as much information as possible when an error occurs.

## Alternative libraries

If you are looking for a more battle tested and feature rich library, we recommend [json-e](https://github.com/json-e/json-e).

We were using `json-e` before, and the reason we decided to build our own library was because of following limitations with `json-e`:

- Unclear error messages. When my templating had an error, it was hard for me to understand where the error was coming from.
- No support for custom functions. We needed custom functions to transform data in arbitrary ways for maximum flexibility.
- Conditional statements lacked a `if, elseif, else` functionality. `$switch` came close, but it allows only one truthy condition.
