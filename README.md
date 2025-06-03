# Jemp

Jemp is a JSON templating engine with conditionals, loops, and custom functions.

## Objectives

- Small and simple API surface
- Fast and performant
- User friendly error codes and messages
- Custom functions

## Parse and Render

$$\begin{align*}
& \textbf{Let:} \\[0.5em]
& D = \text{Data} \\
& T = \text{Template} \\
& F = \text{Custom Functions} \\
& A = \text{AST (Abstract Syntax Tree)} \\
& R = \text{Result} \\[1em]
& \textbf{Then:} \\[0.5em]
& A = \mathtt{Parse}(T, F) \\
& R = \mathtt{Render}(A, D, F) \\[1em]
& \textbf{Or by composition:} \\[0.5em]
& R = \mathtt{Render}(\mathtt{Parse}(T, F), D, F) \\
\end{align*}$$

During `Parse` phase, the objective is to do all the performance critical work and validation. `Parse` only makes use of `Custom Functions` for validation purpose. This should be done at build time. The `AST` should require minimal time to be rendered.

During `Render` phase, the objective is to do the actual rendering. This should be done at runtime, and should be as fast as possible.

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
- Nested properties work line lodash get notation.

```yaml
template:
  fullName: "${fullName.firstName} ${fullName.lastName}"
  age: "${age}"
  city: "I live in ${city}"
  isAdult: ${isAdult}
  firstHobby: "${hobbies[0]}"
  allHobbies: "${hobbies}"

cases:
  - data:
      fullName:
        firstName: "John"
        lastName: "Doe"
      age: 30
      city: "New York"
      isAdult: true
      hobbies: ["reading", "writing", "coding"]

    output:
      fullName: "John Doe"
      age: 30
      city: "I live in New York"
      isAdult: true
      firstHobby: "reading"
      allHobbies: ["reading", "writing", "coding"]
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

### Comparison operations

```yaml
template:
  name: "${name}"

  # strings
  $if name == "John":
    welcome1: "You are John"
  $if name != "John":
    welcome2: "You are not John"

  # booleans:
  $if isAdult:
    welcome1: "You are an adult"
  $if !isAdult:
    welcome2: "You are not an adult"

  # numbers
  $if age == 30:
    welcome1: You are 30 years old
  $if age >= 60:
    welcome2: "You are above or equal 60"
  $if age > 60:
    welcome3: "You are above 60"
  $if age < 18:
    welcome4: "You are under 18"
  $if age <= 18:
    welcome5: "You are under or equal to 18"

  # arrays
  hobbies:
    - $if "reading" in hobbies:
      - reading: true

cases:
  - data:
      age: 30
      hobbies: ["reading", "writing", "coding"]
    output:
      welcome1: "You are 30 years old"
      hobbies:
        - reading: true

```

### And Or operations

```yaml
template:
  name: "${name}"
  # strings
  $if name == "John" && age == 30:
    welcome1: "You are John and 30 years old"
  $if name == "John" || age == 30:
    welcome2: "You are John or 30 years old"

cases:
  - data:
      name: "John"
      age: 30
    output:
      welcome1: "You are John and 30 years old"
      welcome2: "You are John or 30 years old"
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

To output literal `${` in strings, use `$${`:

```yaml
data:
  price: 100

template:
  message: "The price is $${price} (literal)"
  actual: "The actual price is ${price}"

output:
  message: "The price is ${price} (literal)"
  actual: "The actual price is 100"
```

## Custom Functions

### Overview
Custom functions provide an escape hatch for advanced use cases while maintaining security and performance.

The library comes with built-in functions and allows registering custom ones.

Functions can return any JSON-serializable value, including objects and arrays.

### Built-in Functions

The library ships with the following built-in functions:

```javascript
// Date/Time functions
now() // Returns current timestamp
```

### Custom Function Registration

Register additional functions when creating the template engine.

```javascript
const engine = new Jemp({
  customFunctions: {
    substring: (str, start, end) => {
      return str.substring(start, end);
    },
    structuredName: (fullName) => {
      const [firstName, lastName] = fullName.split(', ');
      return {
        firstName,
        lastName
      };
    }
  }
});
```

### Usage in Templates

Functions can be used anywhere expressions are allowed:

```yaml
data:
  userString: "John, Doe
  startDate: "2024-01-01"

template:
  # Built-in functions
  timestamp: "${now()}"
  string: "${substring(userString, 0, 5)}"
  structuredName: "${structuredName(userString)}"

output:
  timestamp: 1704067200000
  string: "John"
  structuredName: {
    firstName: "John",
    lastName: "Doe"
  }
```

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

* Unclear error messages. When my templating had an error, it was hard for me to understand where the error was coming from.
* No support for custom functions. We needed custom functions to transform data in arbitrary ways for maximum flexibility.
* Conditional statements lacked a `if, elseif, else` functionality. `$switch` came close, but it allows only one truthy condition.
