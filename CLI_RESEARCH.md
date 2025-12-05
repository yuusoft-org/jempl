# CLI Interface Research & Analysis

## Research Date
2025-01-16

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
hbs -D '{\"name\":\"John\"}' ./template.hbs
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

### 💡 Consider Adding

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
