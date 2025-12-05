---
title: Implement CLI version for jempl library
status: todo
priority: medium
---

# Description

Create a command-line interface for the jempl templating library that allows users to render templates from the terminal. The CLI should support both file inputs and raw strings for templates and data, with support for JSON and YAML formats.

# CLI Design & Interface

## Overview

The CLI will provide a simple, intuitive interface for rendering jempl templates. It follows common CLI patterns and supports flexible input methods.

## Command Structure

```bash
jempl [options] <template> <data>
```

### Basic Usage Examples

**1. Using files (JSON):**
```bash
jempl template.json data.json
```

**2. Using files (YAML):**
```bash
jempl template.yaml data.yaml
```

**3. Using files (mixed formats):**
```bash
jempl template.yaml data.json
```

**4. Using raw JSON strings:**
```bash
jempl '{"name": "${user.name}"}' '{"user": {"name": "John"}}'
```

**5. Using raw YAML strings:**
```bash
jempl 'name: ${user.name}' 'user:\n  name: John'
```

**6. Template from file, data from string:**
```bash
jempl template.json '{"user": {"name": "John"}}'
```

**7. Template from string, data from file:**
```bash
jempl '{"name": "${user.name}"}' data.json
```

**8. With custom functions file:**
```bash
jempl template.json data.json --functions functions.js
```

**9. With partials file:**
```bash
jempl template.json data.json --partials partials.json
```

**10. With output file:**
```bash
jempl template.json data.json --output result.json
```

**11. With YAML output:**
```bash
jempl template.yaml data.yaml --output result.yaml --format yaml
```

**12. Using stdin for data:**
```bash
cat data.json | jempl template.json -
```

**13. Pretty-printed output:**
```bash
jempl template.json data.json --pretty
```

## Arguments

### Positional Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `<template>` | Template source (file path or raw string) | Yes |
| `<data>` | Data source (file path, raw string, or `-` for stdin) | Yes |

### Detection Logic

The CLI will automatically detect whether an argument is a file path or raw string:

1. **File Path Detection:**
   - If the string ends with `.json`, `.yaml`, or `.yml` → try to read as file
   - If the file exists → read as file
   - If the file doesn't exist → error with helpful message

2. **Raw String Detection:**
   - If it doesn't match file patterns → try to parse as JSON
   - If JSON parsing fails → try to parse as YAML
   - If both fail → error with parsing details

3. **Stdin Detection:**
   - If the argument is exactly `-` → read from stdin

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--functions <file>` | `-f` | JavaScript file exporting custom functions | none |
| `--partials <file>` | `-p` | JSON/YAML file with partial templates | none |
| `--output <file>` | `-o` | Output file path (stdout if not specified) | stdout |
| `--format <format>` | | Output format: `json` or `yaml` | auto-detect from output file or `json` |
| `--pretty` | | Pretty-print JSON output with indentation | false |
| `--indent <spaces>` | `-i` | Number of spaces for indentation (when --pretty) | 2 |
| `--help` | `-h` | Show help message | |
| `--version` | `-v` | Show version number | |

## Input Format Detection

### Template & Data

- **File extension detection:**
  - `.json` → Parse as JSON
  - `.yaml`, `.yml` → Parse as YAML

- **String detection (fallback order):**
  1. Try JSON parse
  2. Try YAML parse
  3. Error if both fail

### Functions File

- Must be a `.js` or `.mjs` file
- Must export functions as default export or named exports
- Example format:
  ```javascript
  // functions.js
  export const add = (a, b) => a + b;
  export const uppercase = (str) => str.toUpperCase();

  // or default export
  export default {
    add: (a, b) => a + b,
    uppercase: (str) => str.toUpperCase()
  };
  ```

### Partials File

- Can be `.json`, `.yaml`, or `.yml`
- Must contain an object with partial names as keys
- Example:
  ```json
  {
    "userCard": {
      "name": "${name}",
      "role": "${role}"
    }
  }
  ```

## Output Format

### Stdout (default)
```bash
jempl template.json data.json
# Output: {"result": "value"}
```

### File Output
```bash
jempl template.json data.json -o output.json
# Writes to output.json
```

### Pretty-printed
```bash
jempl template.json data.json --pretty
# Output:
# {
#   "result": "value"
# }
```

### YAML Output
```bash
jempl template.yaml data.yaml --format yaml
# Output:
# result: value
```

## Error Handling

### Clear Error Messages

**1. File not found:**
```
Error: Template file not found: template.json
```

**2. Parse error:**
```
Error: Failed to parse template
  Format: JSON
  Error: Unexpected token } in JSON at position 45
```

**3. Invalid function file:**
```
Error: Failed to load functions from functions.js
  Error: functions.js must export an object or named exports
```

**4. Render error:**
```
Error: Template rendering failed
  Location: data.user.name (line 3, col 10)
  Error: Variable 'user.name' is undefined
```

**5. Invalid option:**
```
Error: Unknown option: --invalid
Try 'jempl --help' for more information
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (parsing, rendering, etc.) |
| 2 | Invalid arguments or options |
| 3 | File I/O error |

## Advanced Usage Examples

### Complex Example with All Features
```bash
jempl template.yaml data.json \
  --functions ./utils/functions.js \
  --partials ./partials.yaml \
  --output ./dist/result.json \
  --pretty \
  --indent 4
```

### Pipeline Usage
```bash
# Generate data dynamically and pipe to jempl
echo '{"name": "John", "age": 30}' | jempl template.json - --pretty

# Chain with other tools
curl https://api.example.com/data | jempl template.json - | jq '.result'
```

### Script Integration
```bash
#!/bin/bash
# generate-configs.sh

for env in dev staging prod; do
  jempl config.template.yaml "data-${env}.yaml" \
    -o "configs/config-${env}.yaml" \
    --format yaml
done
```

## Help Text

```
jempl - JSON templating engine CLI

USAGE:
  jempl [options] <template> <data>

ARGUMENTS:
  <template>    Template source (file path or raw JSON/YAML string)
  <data>        Data source (file path, raw JSON/YAML string, or '-' for stdin)

OPTIONS:
  -f, --functions <file>   JavaScript file with custom functions
  -p, --partials <file>    JSON/YAML file with partial templates
  -o, --output <file>      Output file path (default: stdout)
      --format <format>    Output format: json or yaml (default: auto-detect)
      --pretty             Pretty-print JSON output
  -i, --indent <spaces>    Indentation spaces when pretty-printing (default: 2)
  -h, --help               Show this help message
  -v, --version            Show version number

EXAMPLES:
  # Render from files
  jempl template.json data.json

  # With custom functions
  jempl template.json data.json -f functions.js

  # Pretty-printed output
  jempl template.json data.json --pretty

  # Use stdin for data
  echo '{"name": "John"}' | jempl template.json -

  # Output to file
  jempl template.yaml data.yaml -o output.yaml --format yaml

  # Raw string inputs
  jempl '{"greeting": "Hello ${name}!"}' '{"name": "World"}'

For more information, visit: https://github.com/yuusoft-org/jempl
```

# Implementation Plan

## 1. Project Setup

- [ ] Create `src/cli/` directory for CLI-specific code
- [ ] Add `bin` field to package.json pointing to CLI entry point
- [ ] Install required dependencies:
  - `commander` or `yargs` (CLI argument parsing)
  - `yaml` (YAML parsing/stringifying)
  - `chalk` (colored error messages)
- [ ] Update package.json scripts to include CLI build

## 2. Core CLI Components

### 2.1 Entry Point (`src/cli/index.js`)
- [ ] Set up shebang (`#!/usr/bin/env node`)
- [ ] Configure CLI argument parser
- [ ] Set up global error handler
- [ ] Implement main CLI logic flow

### 2.2 Input Handler (`src/cli/input.js`)
- [ ] Implement file vs string detection logic
- [ ] Create file reader with error handling
- [ ] Implement stdin reader
- [ ] Create format detection (JSON/YAML)
- [ ] Implement parser with fallback logic

### 2.3 Output Handler (`src/cli/output.js`)
- [ ] Implement stdout writer
- [ ] Implement file writer
- [ ] Create JSON formatter (with pretty-print option)
- [ ] Create YAML formatter
- [ ] Implement format auto-detection from file extension

### 2.4 Functions Loader (`src/cli/functions.js`)
- [ ] Implement ES module loader for functions
- [ ] Validate function exports
- [ ] Handle default vs named exports
- [ ] Error handling for invalid function files

### 2.5 Error Handler (`src/cli/errors.js`)
- [ ] Create error formatter with colors
- [ ] Map error types to exit codes
- [ ] Implement context-aware error messages
- [ ] Add helpful suggestions for common errors

### 2.6 Help & Version (`src/cli/help.js`)
- [ ] Create help text template
- [ ] Implement version display
- [ ] Add usage examples

## 3. File Structure

```
src/
├── cli/
│   ├── index.js           # Main CLI entry point
│   ├── input.js           # Input handling (files, strings, stdin)
│   ├── output.js          # Output handling (stdout, files)
│   ├── functions.js       # Functions loader
│   ├── errors.js          # Error handling & formatting
│   └── help.js            # Help text & version
├── index.js               # Library exports (unchanged)
├── render.js              # Render logic (unchanged)
├── parse/                 # Parser logic (unchanged)
└── ...
```

## 4. Testing Strategy

- [ ] Unit tests for input detection logic
- [ ] Unit tests for format parsing (JSON/YAML)
- [ ] Unit tests for output formatting
- [ ] Integration tests with real files
- [ ] Integration tests with stdin
- [ ] Error handling tests
- [ ] Cross-platform tests (Windows, macOS, Linux)

## 5. Documentation

- [ ] Update README.md with CLI section
- [ ] Create CLI.md with detailed usage
- [ ] Add examples directory with sample templates
- [ ] Create tutorial for common use cases

## 6. Package Distribution

- [ ] Test local installation with `npm link`
- [ ] Test global installation
- [ ] Verify bin command works on all platforms
- [ ] Update npm keywords for CLI discoverability
- [ ] Add CLI badge to README

# Technical Considerations

## Dependencies

**Recommended:**
- `commander` (MIT) - Mature, well-documented CLI framework
- `js-yaml` (MIT) - Standard YAML parser for Node.js
- `chalk` (MIT) - Terminal styling

**Alternative (lightweight):**
- Write custom argument parser (no dependencies)
- Use built-in JSON only (skip YAML)
- Use basic ANSI codes (skip chalk)

## Performance

- Lazy-load YAML parser (only when needed)
- Stream large files when possible
- Minimize startup time for CLI responsiveness

## Cross-Platform Compatibility

- Use path.resolve() for file paths
- Handle different line endings (CRLF vs LF)
- Test on Windows, macOS, and Linux
- Use `cross-env` if environment variables are needed

## Security

- Validate file paths to prevent directory traversal
- Sanitize error messages to avoid leaking paths
- Document that custom functions execute with full Node.js access

# Success Criteria

- [ ] CLI can render templates from files and strings
- [ ] Supports both JSON and YAML for all inputs/outputs
- [ ] Custom functions can be loaded from JS files
- [ ] Partials can be loaded from JSON/YAML files
- [ ] Error messages are clear and actionable
- [ ] Help text is comprehensive
- [ ] Works on Windows, macOS, and Linux
- [ ] Can be installed globally with npm
- [ ] Includes comprehensive tests
- [ ] Documentation is complete

# Research Findings (2025-01-16)

## Objective
Research popular templating CLI tools to validate our jempl CLI design follows familiar patterns and best practices.

---

## Industry Standards Analysis

### 1. j2cli (Jinja2 Command-Line Tool)

**GitHub:** https://github.com/kolypto/j2cli

**Basic Syntax:**
```bash
j2 [options] <template> [data_source]
```

**Key Features:**
- Template is first positional argument
- Data is second positional argument (optional - can use env vars)
- Supports multiple formats: JSON, YAML, INI, environment variables
- Can read from stdin: `curl http://example.com/data.json | j2 --format=json template.j2`
- Format flag: `--format, -f`
- Output flag: `-o`
- Import environment variables: `--import-env`

**Examples:**
```bash
j2 config.j2 data.json
j2 config.j2 data.yml
j2 config.j2 data.ini
j2 config.j2  # Uses env vars only
curl http://example.com/service.json | j2 --format=json config.j2
```

---

### 2. jinja2-cli (Official Jinja2 CLI)

**GitHub:** https://github.com/mattrobenolt/jinja2-cli

**Basic Syntax:**
```bash
jinja2 [options] <input template> <input data>
```

**Key Features:**
- Template first, data second
- Auto-format detection with `--format=FORMAT`
- Supports: json, yaml, ini, xml, toml, and more
- Can read from stdin: `cat data.json | jinja2 template.tmpl`
- Define variables inline: `-D key=value`
- Strict mode: `--strict` (disallow undefined variables)
- Section selection: `-s SECTION`

**Examples:**
```bash
jinja2 helloworld.tmpl data.json --format=json
cat data.json | jinja2 helloworld.tmpl
curl -s http://httpbin.org/ip | jinja2 helloip.tmpl
jinja2 template.j2 data.json -D env=production
```

---

### 3. mustache CLI

**Basic Syntax:**
```bash
mustache <view> <template> [output]
```

**Key Features:**
- **Different order**: Data (view) comes FIRST, template comes SECOND
- Optional third argument for output file
- Very simple interface
- Auto-detects JSON vs JS files by extension
- Outputs to stdout by default

**Examples:**
```bash
mustache view.json template.mustache
mustache view.json template.mustache output.html
```

---

### 4. hbs-cli (Handlebars CLI)

**GitHub:** https://github.com/keithamus/hbs-cli

**Basic Syntax:**
```bash
hbs [-P <partial>]... [-H <helper>]... [-D <data>]... [-o <directory>] [--] (<template...>)
```

**Key Features:**
- **Template-centric**: Templates are positional arguments
- Data loaded via `-D, --data` flag (can specify multiple times)
- Partials via `-P, --partial` (glob patterns supported)
- Helpers via `-H, --helper` (glob patterns supported)
- Output directory: `-o, --output`
- Supports stdin: `-i, --stdin`
- Stdout mode: `-s, --stdout`

**Examples:**
```bash
hbs --data ./package.json --data ./extra.json ./homepage.hbs --output ./site/
hbs --helper ./helpers/* --partial ./partials/* ./index.hbs
hbs -D '{"name":"John"}' ./template.hbs
```

---

## Common Patterns Identified

### 1. Argument Order

| Tool | Pattern |
|------|---------|
| j2cli | `<template> <data>` |
| jinja2-cli | `<template> <data>` |
| **mustache** | `<data> <template>` (outlier) |
| hbs-cli | `<template>` with `-D` for data |
| **jempl (ours)** | `<template> <data>` ✅ |

**Conclusion:** Most tools follow `<template> <data>` order. Our design is correct.

---

### 2. Format Detection

**Common Approaches:**
1. **Auto-detection from file extension** (most common)
   - `.json` → JSON
   - `.yaml`, `.yml` → YAML

2. **Explicit `--format` flag** (when auto-detection fails or for stdin)
   - `--format=json`
   - `--format=yaml`

3. **Fallback parsing** (try multiple parsers)
   - Try JSON first, then YAML

**Our Design:** ✅ We implement all three approaches
- Auto-detect from extension
- Allow explicit `--format` flag for output
- Fallback parsing for raw strings (JSON → YAML)

---

### 3. Stdin Support

**Standard Pattern:**
```bash
cat data.json | tool template.tmpl
curl http://api.com/data | tool template.tmpl
```

**Common Conventions:**
1. **Dash `-` for stdin** (most explicit)
   - `tool template.tmpl -`

2. **No data argument** (implicit stdin)
   - `cat data.json | tool template.tmpl`

3. **Pipe detection** (automatic)

**Our Design:** ✅ We use the explicit `-` approach which is clearest

---

### 4. Output Options

**Standard Options:**

| Flag | Purpose | Tools Using It |
|------|---------|----------------|
| `-o, --output <file>` | Write to file | j2cli, hbs-cli, jempl ✅ |
| `--format <format>` | Output format | jinja2-cli, jempl ✅ |
| `--pretty` | Pretty-print JSON | jempl ✅ |
| `-s, --stdout` | Explicit stdout | hbs-cli |

**Our Design:** ✅ Follows standard patterns

---

### 5. Helper Functions / Custom Functions

**Approaches:**

| Tool | Approach |
|------|----------|
| hbs-cli | `-H, --helper <glob>` (can specify multiple) |
| j2cli | `--import-env VAR` (environment variables) |
| jinja2-cli | `-e EXTENSIONS` (Jinja2 extensions) |
| **jempl** | `-f, --functions <file>` ✅ |

**Our Design:** ✅ Simple and clear, follows similar pattern to hbs-cli

---

### 6. Partials / Templates

**Approaches:**

| Tool | Approach |
|------|----------|
| hbs-cli | `-P, --partial <glob>` |
| **jempl** | `-p, --partials <file>` ✅ |

**Our Design:** ✅ Consistent with industry patterns

---

## Key Differences in Our Design

### 1. File vs String Detection (Automatic)

**Our Approach:**
```bash
# Automatic detection
jempl template.json data.json              # Files
jempl '{"name": "${x}"}' '{"x": "value"}' # Strings
jempl template.json '{"x": "value"}'       # Mixed
```

**Industry Approach:**
- Most tools REQUIRE file extensions
- Raw strings are less common
- Some tools use special prefixes like `@` for files

**Analysis:**
- ⚠️ **Potential Confusion**: Auto-detection might be unclear
- ✅ **More Flexible**: Supports more use cases
- 💡 **Recommendation**: Document clearly with examples

---

### 2. Format Flexibility

**Our Support:**
- JSON → JSON ✅
- YAML → YAML ✅
- JSON → YAML ✅
- YAML → JSON ✅
- Mixed template/data formats ✅

**Industry Support:**
- Most tools: Same format for input/output
- j2cli: Good flexibility
- jinja2-cli: Good flexibility

**Analysis:** ✅ Our flexibility is a feature, not a bug

---

### 3. Output Format Control

**Our Approach:**
```bash
--format <format>    # Explicit format (json or yaml)
--pretty             # Pretty-print JSON
--indent <spaces>    # Indentation control
```

**Industry Approach:**
- Usually just `--format` or file extension detection
- Pretty-printing less common

**Analysis:** ✅ More control is good for a JSON-focused tool

---

## Recommendations

### ✅ Keep As-Is

1. **Argument order** `<template> <data>` - industry standard
2. **Option names** `-o`, `-f`, `-p` - familiar and clear
3. **Stdin support** with `-` - explicit and clear
4. **Format detection** - comprehensive and smart
5. **Pretty-printing** - useful for JSON tools

---

### 💡 Consider Adding (v2)

1. **Environment variable support** (like j2cli)
   ```bash
   jempl template.json --env  # Use process.env as data
   ```

2. **Inline data definition** (like jinja2-cli)
   ```bash
   jempl template.json -D name=John -D age=30
   ```

3. **Format flag for input** (when auto-detection fails)
   ```bash
   jempl template.txt data.txt --input-format=json
   ```

4. **Multiple data files** (like hbs-cli)
   ```bash
   jempl template.json -D data1.json -D data2.json
   # Merge data1 and data2
   ```

5. **Glob patterns for templates** (like hbs-cli)
   ```bash
   jempl 'templates/*.json' data.json -o output/
   ```

---

### ⚠️ Clarify in Documentation

1. **File vs String detection rules**
   - Be explicit about when something is treated as a file
   - Show examples of edge cases

2. **Format precedence**
   - Extension → `--format` flag → auto-detection
   - Document the order clearly

3. **Error messages**
   - When file doesn't exist: "Did you mean to use a raw string?"
   - When parsing fails: "Expected JSON or YAML format"

---

## Validation Summary

### ✅ Strengths (Aligned with Industry)

1. **Argument order** - Same as j2cli, jinja2-cli
2. **Option flags** - Standard short/long forms
3. **Stdin support** - Clear `-` syntax
4. **Output control** - Comprehensive options
5. **Format flexibility** - Matches or exceeds competitors

### 💡 Unique Features (Good!)

1. **Automatic file vs string detection** - More flexible than most
2. **Mixed format support** - YAML template + JSON data
3. **Pretty-printing control** - Great for JSON tooling
4. **Single data file simplicity** - Less complex than hbs-cli

### ⚠️ Potential Issues

1. **Auto-detection ambiguity** - Need clear documentation
2. **Missing env var support** - Common in j2cli
3. **Missing inline data** - Common in jinja2-cli
4. **No batch processing** - Common in hbs-cli

---

## Final Conclusion

### Our CLI Design is **EXCELLENT** ✅

**Reasons:**

1. ✅ **Follows industry standards** for argument order and option naming
2. ✅ **More flexible** than most competitors (format mixing, auto-detection)
3. ✅ **Clear and intuitive** syntax
4. ✅ **Comprehensive output control** (format, pretty, indent)
5. ✅ **Good error handling** design

**Improvements Suggested (Optional):**

1. Add environment variable support (`--env`)
2. Add inline data definitions (`-D key=value`)
3. Consider multiple data file merging
4. Enhance documentation for file vs string detection

**Priority:** Ship the current design. It's solid. Add features in v2.

---

## Reference Links

- j2cli: https://github.com/kolypto/j2cli
- jinja2-cli: https://github.com/mattrobenolt/jinja2-cli
- mustache CLI: https://www.npmjs.com/package/mustache
- hbs-cli: https://github.com/keithamus/hbs-cli
- LiquidJS CLI: https://liquidjs.com/tutorials/setup.html

---

# Future Enhancements (Out of Scope for v1)

- [ ] Environment variable support (`--env` flag)
- [ ] Inline data definitions (`-D key=value`)
- [ ] Multiple data file merging
- [ ] Glob patterns for batch processing
- [ ] Watch mode for auto-recompilation
- [ ] Config file support (.jemplrc)
- [ ] Template validation mode (parse only, no render)
- [ ] Performance profiling mode
- [ ] Template formatting/linting
- [ ] Interactive mode
- [ ] Shell completion scripts (bash, zsh, fish)

