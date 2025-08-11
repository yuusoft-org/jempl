# Jempl

[![npm version](https://badge.fury.io/js/jempl.svg)](https://www.npmjs.com/package/jempl)

Jempl is a JSON templating engine with conditionals, loops, partials, and custom functions.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Variable Replacement](#variable-replacement)
- [Conditionals](#conditionals)
- [Loops](#loops)
- [Partials](#partials)
- [Custom Functions](#custom-functions)
- [Escaping](#escaping)
- [Performance](#performance)
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
  "$if user.age >= 18": {
    status: "adult"
  },
  "$else": {
    status: "minor"
  }
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

### Object Conditionals with $when

The `$when` directive conditionally includes or excludes entire objects based on a condition. Unlike `$if` which merges properties into the parent, `$when` controls whether the entire object exists.

#### Key Differences from $if

- **$if**: Merges properties into parent object when true
- **$when**: Includes/excludes the entire object based on condition

#### Basic Usage

```yaml
template:
  # Object is included only if condition is true
  user:
    $when: showUserInfo
    name: "${name}"
    email: "${email}"
    age: "${age}"

cases:
  - data:
      showUserInfo: true
      name: "Alice"
      email: "alice@example.com"
      age: 30
    output:
      user:
        name: "Alice"
        email: "alice@example.com"
        age: 30
  
  - data:
      showUserInfo: false
      name: "Bob"
      email: "bob@example.com"
      age: 25
    output: {}  # user object is excluded entirely
```

#### Arrays with $when

`$when` is particularly useful for filtering arrays - objects with false conditions are automatically excluded:

```yaml
template:
  menu:
    - $when: true
      label: "Home"
      path: "/"
    - $when: isLoggedIn
      label: "Dashboard"
      path: "/dashboard"
    - $when: isAdmin
      label: "Admin Panel"
      path: "/admin"
    - $when: false
      label: "Hidden"
      path: "/hidden"

cases:
  - data:
      isLoggedIn: true
      isAdmin: false
    output:
      menu:
        - label: "Home"
          path: "/"
        - label: "Dashboard"
          path: "/dashboard"
        # Admin and Hidden items are excluded
```

#### Complex Conditions

`$when` supports all the same operators and expressions as `$if`:

```yaml
template:
  permissions:
    - $when: userRole == "admin" || userRole == "moderator"
      action: "delete"
      resource: "posts"
    - $when: age >= 18 && hasConsent
      action: "purchase"
      resource: "products"
    - $when: !isBlocked && emailVerified
      action: "comment"
      resource: "articles"

cases:
  - data:
      userRole: "moderator"
      age: 25
      hasConsent: true
      isBlocked: false
      emailVerified: true
    output:
      permissions:
        - action: "delete"
          resource: "posts"
        - action: "purchase"
          resource: "products"
        - action: "comment"
          resource: "articles"
```

#### Combining $when with $if

You can use `$when` and `$if` together - `$when` is evaluated first:

```yaml
template:
  card:
    $when: showCard
    title: "User Card"
    $if isPremium:
      badge: "Premium"
      features: ["Feature A", "Feature B", "Feature C"]
    $else:
      badge: "Basic"
      features: ["Feature A"]

cases:
  - data:
      showCard: true
      isPremium: true
    output:
      card:
        title: "User Card"
        badge: "Premium"
        features: ["Feature A", "Feature B", "Feature C"]
  
  - data:
      showCard: false
      isPremium: true
    output: {}  # Entire card is excluded, $if is never evaluated
```

#### Nested $when Conditions

```yaml
template:
  app:
    $when: appEnabled
    header:
      $when: showHeader
      title: "My App"
      logo: "logo.png"
    content:
      $when: hasContent
      text: "Welcome"
    footer:
      copyright: "2024"

cases:
  - data:
      appEnabled: true
      showHeader: true
      hasContent: false
    output:
      app:
        header:
          title: "My App"
          logo: "logo.png"
        footer:
          copyright: "2024"
        # content is excluded
  
  - data:
      appEnabled: false
      showHeader: true
      hasContent: true
    output: {}  # Entire app is excluded, nested conditions are not evaluated
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

## Partials

Partials allow you to define reusable template fragments that can be included and parameterized throughout your templates. This enables better code organization and reusability.

### Basic Usage

Partials are defined in the `partials` section of the options and referenced using `$partial`:

```javascript
import { parseAndRender } from 'jempl';

const template = {
  header: {
    $partial: "greeting"
  }
};

const data = {
  name: "World"
};

const partials = {
  greeting: {
    message: "Hello ${name}!"
  }
};

const result = parseAndRender(template, data, { partials });
// Output: { header: { message: "Hello World!" } }
```

### Inline Data Override

You can pass data directly to a partial, which overrides the context data:

```yaml
template:
  card:
    $partial: "userCard"
    name: "Alice"
    role: "Admin"

data:
  name: "Bob"
  role: "User"

partials:
  userCard:
    name: "${name}"
    role: "${role}"
    display: "${name} (${role})"

output:
  card:
    name: "Alice"
    role: "Admin"
    display: "Alice (Admin)"
```

### Partials in Arrays

Partials work seamlessly within arrays and loops:

```yaml
template:
  menu:
    - $partial: "menuItem"
      label: "Home"
      path: "/"
    - $partial: "menuItem"
      label: "About"
      path: "/about"
    - $partial: "menuItem"
      label: "Contact"
      path: "/contact"

partials:
  menuItem:
    label: "${label}"
    path: "${path}"
    active: false

output:
  menu:
    - label: "Home"
      path: "/"
      active: false
    - label: "About"
      path: "/about"
      active: false
    - label: "Contact"
      path: "/contact"
      active: false
```

### Partials with Loops

Combine partials with `$for` loops for dynamic content generation:

```yaml
template:
  items:
    $for item, i in items:
      - $partial: "itemCard"

data:
  items:
    - id: 1
      name: "First"
    - id: 2
      name: "Second"

partials:
  itemCard:
    id: "${item.id}"
    label: "${item.name}"
    index: "${i}"

output:
  items:
    - id: 1
      label: "First"
      index: 0
    - id: 2
      label: "Second"
      index: 1
```

### Nested Partials

Partials can include other partials, enabling complex component hierarchies:

```yaml
template:
  page:
    $partial: "layout"
    title: "My Page"

data:
  user: "John"

partials:
  layout:
    header:
      $partial: "header"
    content: "Welcome to ${title}"
  header:
    title: "${title}"
    user: "${user}"
    greeting: "Hello ${user}!"

output:
  page:
    header:
      title: "My Page"
      user: "John"
      greeting: "Hello John!"
    content: "Welcome to My Page"
```

### Partials with Conditionals

Use conditionals within partials for dynamic rendering:

```yaml
template:
  users:
    - $partial: "userStatus"
      name: "Alice"
      age: 25
    - $partial: "userStatus"
      name: "Bob"
      age: 16

partials:
  userStatus:
    name: "${name}"
    age: "${age}"
    $if age >= 18:
      status: "adult"
      canVote: true
    $else:
      status: "minor"
      canVote: false

output:
  users:
    - name: "Alice"
      age: 25
      status: "adult"
      canVote: true
    - name: "Bob"
      age: 16
      status: "minor"
      canVote: false
```

### Partials with $when

Combine partials with `$when` for conditional inclusion:

```yaml
template:
  menu:
    - $when: true
      $partial: "menuItem"
      label: "Home"
      path: "/"
    - $when: isLoggedIn
      $partial: "menuItem"
      label: "Dashboard"
      path: "/dashboard"
    - $when: isAdmin
      $partial: "menuItem"
      label: "Admin"
      path: "/admin"

data:
  isLoggedIn: true
  isAdmin: false

partials:
  menuItem:
    label: "${label}"
    path: "${path}"
    active: false

output:
  menu:
    - label: "Home"
      path: "/"
      active: false
    - label: "Dashboard"
      path: "/dashboard"
      active: false
```

### Escaped Properties in Partials

Partials support escaped dollar properties for keys that start with `$`:

```yaml
template:
  pricing:
    $partial: "pricing"
    \$price: 99.99
    $$currency: "USD"
    displayPrice: "$99.99"

partials:
  pricing:
    price: "${$price}"
    currency: "${$currency}"
    display: "${displayPrice}"

output:
  pricing:
    price: 99.99
    currency: "USD"
    display: "$99.99"
```

### Complex Example

Here's a comprehensive example showing partials used in a dashboard:

```yaml
template:
  dashboard:
    $partial: "dashboard"
    widgets:
      - $partial: "widget"
        type: "chart"
        data: [10, 20, 30]
      - $partial: "widget"
        type: "table"
        data: ["A", "B", "C"]

data:
  user: "Admin"

partials:
  dashboard:
    title: "Dashboard for ${user}"
    widgets: "${widgets}"
  widget:
    type: "${type}"
    data: "${data}"
    $if type == "chart":
      visualization: "bar"
    $elif type == "table":
      visualization: "grid"

output:
  dashboard:
    title: "Dashboard for Admin"
    widgets:
      - type: "chart"
        data: [10, 20, 30]
        visualization: "bar"
      - type: "table"
        data: ["A", "B", "C"]
        visualization: "grid"
```

### Error Handling

Jempl provides clear error messages for common partial issues:

- **Undefined Partial**: `Render Error: Partial 'nonexistent' is not defined`
- **Circular Reference**: `Render Error: Circular partial reference detected: recursive`
- **Invalid Name**: `Parse Error: $partial value must be a string`
- **Conflicting Directives**: `Parse Error: Cannot use $partial with $if at the same level`

### Partial Restrictions

- Partial names must be non-empty strings
- Cannot use `$partial` with `$if`, `$elif`, `$else`, or `$for` at the same level
- Circular references between partials are detected and prevented
- Partials inherit the current context but can override with inline data

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

const result = parseAndRender(template, data, { functions: customFunctions });
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

## Performance

Jempl is designed for **high-performance template rendering** with ultra-fast execution suitable for real-time browser applications.

### 🚀 Key Performance Metrics

| Template Type | Performance | Renders/sec | Use Case |
|---------------|-------------|-------------|----------|
| Simple variables | ~0.001ms | 1,000,000+ | Basic interpolation |
| Loop with 100 items | ~0.029ms | 34,000+ | Data lists |
| Nested loops (10x10) | ~0.033ms | 30,000+ | Complex structures |
| **Conditionals in loops** | **~0.004ms** | **250,000+** | **Dynamic filtering** 🏆 |
| Todo app template | ~0.139ms | 7,000+ | Real-world apps |

### ⚡ Optimization Features

- **Nuclear Pattern Recognition**: Hardcoded ultra-specialized renderers for common patterns
- **Multi-Tier Optimization**: 4-level optimization strategy with graceful fallback
- **Zero-Allocation Paths**: Minimal memory pressure for hot paths
- **Aggressive Inlining**: Eliminates function call overhead in loops

### 📈 Real-Time Ready

Jempl achieves **sub-millisecond rendering** for most templates, making it suitable for:
- Real-time dashboards with frequent data updates
- Interactive applications requiring immediate UI feedback
- High-frequency rendering in games and visualizations
- Mobile applications where performance is critical

> **📖 Full Performance Documentation**: See [PERFORMANCE.md](./PERFORMANCE.md) for detailed benchmarks, optimization techniques, and performance tuning tips.

## Alternative libraries

If you are looking for a more battle tested and feature rich library, we recommend [json-e](https://github.com/json-e/json-e).

We were using `json-e` before, and the reason we decided to build our own library was because of following limitations with `json-e`:

- Unclear error messages. When my templating had an error, it was hard for me to understand where the error was coming from.
- No support for custom functions. We needed custom functions to transform data in arbitrary ways for maximum flexibility.
- Conditional statements lacked a `if, elseif, else` functionality. `$switch` came close, but it allows only one truthy condition.
