# Jempl CLI

Command-line interface for the jempl JSON templating engine.

## Installation

```bash
npm install -g jempl
```

## Usage

```bash
jempl [options] <template> [data]
```

## Arguments

- `template` - Existing template file path, raw JSON/YAML template string, or `-` for stdin
- `data` - Existing data file path, raw JSON/YAML data string, or `-` for stdin (optional; defaults to `{}`)

## Options

- `-o, --output <file>` - Output file path (default: stdout)
- `-f, --format <format>` - Output format: `json` or `yaml` (default: `json`; other values fail)
- `-p, --partials <file>` - Partials file path (JSON or YAML)
- `--functions <file>` - Custom functions file path (JS module)
- `--pretty` - Pretty-print JSON output
- `--indent <number>` - Indentation spaces for pretty JSON or YAML output: integer from 1 to 10 (default: 2)
- `-h, --help` - Display help
- `-V, --version` - Output version number

## Examples

### Basic Usage

**With files:**
```bash
jempl template.json data.json
```

Existing files can have any name, including names without an extension:

```bash
jempl ./template ./data
```

**With raw strings:**
```bash
jempl '{"name":"${x}"}' '{"x":"world"}'
# Output: {"name":"world"}
```

**Mixed (file template + raw data):**
```bash
jempl template.json '{"name":"Alice","age":30}'
```

### Pretty Output

```bash
jempl template.json data.json --pretty
```

Output:
```json
{
  "name": "Alice",
  "age": 30
}
```

### Format Conversion

**JSON to YAML:**
```bash
jempl template.json data.json --format yaml
```

**YAML to JSON:**
```bash
jempl template.yaml data.yaml --format json
```

**YAML to YAML:**
```bash
jempl template.yaml data.yaml --format yaml
```

`--format` selects the output format only. JSON and YAML input can each produce either output format.

### Output to File

```bash
jempl template.json data.json -o output.json
```

### Using Stdin

```bash
cat data.json | jempl template.json -
```

```bash
curl http://api.example.com/data.json | jempl template.json -
```

### With Partials

**partials.json:**
```json
{
  "header": {
    "title": "My Site",
    "logo": "logo.png"
  },
  "footer": {
    "copyright": "© 2024"
  }
}
```

**template.json:**
```json
{
  "header": {
    "$partial": "header"
  },
  "content": "Welcome ${name}!",
  "footer": {
    "$partial": "footer"
  }
}
```

```bash
jempl template.json '{"name":"Alice"}' -p partials.json --pretty
```

Output:
```json
{
  "header": {
    "title": "My Site",
    "logo": "logo.png"
  },
  "content": "Welcome Alice!",
  "footer": {
    "copyright": "© 2024"
  }
}
```

### With Custom Functions

**functions.js:**
```javascript
export default {
  upper: (str) => str.toUpperCase(),
  double: (num) => num * 2,
  formatDate: (date) => new Date(date).toLocaleDateString()
};
```

**template.json:**
```json
{
  "name": "${upper(name)}",
  "doubled": "${double(age)}",
  "date": "${formatDate(timestamp)}"
}
```

```bash
jempl template.json data.json --functions functions.js --pretty
```

### Complex Example

Combining all features:

```bash
jempl template.yaml data.yaml \
  --partials partials.yaml \
  --functions functions.js \
  --format json \
  --pretty \
  --indent 4 \
  -o output.json
```

## Template Syntax

### Variables

```json
{
  "name": "${user.name}",
  "age": "${user.age}"
}
```

### Conditionals

```json
{
  "$if isAdult": {
    "status": "adult"
  },
  "$else": {
    "status": "minor"
  }
}
```

### Loops

```json
[
  {
    "$each": "user in users",
    "name": "${user.name}",
    "email": "${user.email}"
  }
]
```

### Partials

```json
{
  "header": {
    "$partial": "header"
  }
}
```

### Functions

```json
{
  "uppercase": "${upper(name)}",
  "sum": "${add(a, b)}"
}
```

## File Paths and Raw Strings

An existing path is read as a file, even when its name has no extension. A
missing argument that looks like a path (for example, a path with separators
or an extension such as `./missing.json` or `missing.yaml`) fails instead of
being parsed as inline content. Other arguments are parsed as raw JSON or YAML
strings:

```bash
jempl '{"file":"${file}"}' 'file: report.json'
# Output: {"file":"report.json"}
```

Either `template` or `data` can be `-` to read from stdin, but not both in
the same command. Quote inline strings so the shell passes them intact.

## Format Detection

For files with recognized extensions, the extension selects the input parser:
- `.json` → JSON
- `.yaml`, `.yml` → YAML

For files with other extensions or no extension, and for all raw strings, the CLI tries JSON first, then YAML. A filename or extension in raw YAML content, as in `file: report.json` above, does not select its parser.

## Error Handling

The CLI provides clear error messages for common issues:

```bash
# Invalid JSON/YAML
jempl '[invalid' '{}'
# Error: Failed to parse data as JSON or YAML

# Missing explicit input path
jempl ./missing.json '{}'
# Error: Input file not found: ./missing.json

# Unsupported output format
jempl '{"ok":true}' --format toml
# Error: --format must be json or yaml

# Invalid indentation
jempl '{"ok":true}' --indent abc
# Error: --indent must be an integer from 1 to 10

# Missing partials file
jempl template.json data.json -p nonexistent.json
# Error: ENOENT: no such file or directory

# Missing functions file
jempl template.json data.json --functions nonexistent.js
# Error: Cannot find module
```

An empty template also fails. `-V` prints the version from the installed package.

## Tips

1. **Use quotes for raw strings:** Always wrap raw JSON/YAML in single quotes to avoid shell expansion
2. **Escape variables:** Use `\${var}` if your shell expands `$` characters
3. **Pretty-print for debugging:** Use `--pretty` to make output more readable
4. **Check format:** Use `--format yaml` to see data in YAML format
5. **Pipe data:** Use stdin (`-`) to pipe data from other commands

## Related

- [Main Documentation](../README.md)
- [API Documentation](../README.md#api)
- [AST Documentation](./AST.md)
