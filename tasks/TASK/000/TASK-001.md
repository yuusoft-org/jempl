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

# Future Enhancements (Out of Scope)

- [ ] Watch mode for auto-recompilation
- [ ] Config file support (.jemplrc)
- [ ] Template validation mode (parse only, no render)
- [ ] Performance profiling mode
- [ ] Template formatting/linting
- [ ] Interactive mode
- [ ] Shell completion scripts (bash, zsh, fish)

