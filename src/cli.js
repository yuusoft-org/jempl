#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import yaml from "js-yaml";
import { parseAndRender } from "./index.js";

const program = new Command();
const { version } = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

// Existing files take precedence; this only identifies missing file paths.
function looksLikeFilePath(input) {
  if (
    path.isAbsolute(input) ||
    /^[A-Za-z]:[\\/]/.test(input) ||
    /^\.{1,2}[\\/]/.test(input)
  ) {
    return true;
  }

  const trimmed = input.trimStart();
  if (
    /[\r\n:]/.test(input) ||
    ["{", "[", '"', "'"].some((prefix) => trimmed.startsWith(prefix))
  ) {
    return false;
  }

  return /[\\/]/.test(input) || path.extname(input) !== "";
}

// Helper to read input (file, stdin, or raw string)
async function readInput(input) {
  if (input === "-") {
    // Read from stdin
    const content = await new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    });
    return { content, filePath: null };
  }

  if (fs.existsSync(input)) {
    return { content: fs.readFileSync(input, "utf8"), filePath: input };
  }

  if (looksLikeFilePath(input)) {
    throw new Error(`Input file not found: ${input}`);
  }

  return { content: input, filePath: null };
}

// Helper to detect format from file extension
function detectFormat(filePath) {
  if (!filePath || filePath === "-") return null;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") return "json";
  if (ext === ".yaml" || ext === ".yml") return "yaml";
  return null;
}

// Helper to parse data (JSON or YAML)
function parseData(str, format = null) {
  let value;
  if (format === "json") {
    value = JSON.parse(str);
  } else if (format === "yaml") {
    value = yaml.load(str);
  } else {
    // Auto-detect raw strings and files without a recognized extension.
    try {
      value = JSON.parse(str);
    } catch {
      try {
        value = yaml.load(str);
      } catch {
        throw new Error("Failed to parse data as JSON or YAML");
      }
    }
  }

  if (value === undefined) {
    throw new Error("Input must contain a JSON or YAML value");
  }
  return value;
}

// Helper to format output
function formatOutput(data, options) {
  const format = options.format || "json";
  if (data === undefined) {
    throw new Error("Rendered template has no value");
  }

  if (format === "yaml") {
    return yaml.dump(data, {
      indent: options.indent || 2,
      lineWidth: -1,
      noRefs: true,
    });
  }

  // JSON output
  const output = options.pretty
    ? JSON.stringify(data, null, options.indent)
    : JSON.stringify(data);
  if (output === undefined) {
    throw new Error("Rendered result cannot be serialized as JSON");
  }
  return output;
}

// Helper to load partials
function loadPartials(partialsPath) {
  if (!partialsPath) return undefined;

  const content = fs.readFileSync(partialsPath, "utf8");
  const format = detectFormat(partialsPath);

  return parseData(content, format);
}

// Helper to load custom functions
function loadFunctions(functionsPath) {
  if (!functionsPath) return undefined;

  const fileUrl = pathToFileURL(path.resolve(functionsPath)).href;
  return import(fileUrl).then((mod) => mod.default || mod);
}

// Main CLI command
program
  .name("jempl")
  .description(
    "A JSON templating engine with conditionals, loops, and custom functions",
  )
  .version(version)
  .argument("<template>", "Template file path or raw template string")
  .argument("[data]", "Data file path, raw data string, or '-' for stdin")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option(
    "-f, --format <format>",
    "Output format: json or yaml (default: json)",
    "json",
  )
  .option("-p, --partials <file>", "Partials file path (JSON or YAML)")
  .option("--functions <file>", "Custom functions file path (JS module)")
  .option("--pretty", "Pretty-print JSON output", false)
  .option("--indent <number>", "Indentation spaces for pretty output", "2")
  .action(async (templateArg, dataArg, options) => {
    try {
      if (options.format !== "json" && options.format !== "yaml") {
        throw new Error("--format must be json or yaml");
      }
      if (options.indent === "" || !/^\d+$/.test(options.indent)) {
        throw new Error("--indent must be an integer from 1 to 10");
      }
      const indent = Number(options.indent);
      if (indent < 1 || indent > 10) {
        throw new Error("--indent must be an integer from 1 to 10");
      }
      if (templateArg === "-" && dataArg === "-") {
        throw new Error("Template and data cannot both read from stdin");
      }

      // Read template
      const templateInput = await readInput(templateArg);
      const template = parseData(
        templateInput.content,
        detectFormat(templateInput.filePath),
      );

      // Read data
      let data = {};
      if (dataArg !== undefined) {
        const dataInput = await readInput(dataArg);
        data = parseData(dataInput.content, detectFormat(dataInput.filePath));
      }

      // Load partials
      const partials = loadPartials(options.partials);

      // Load custom functions
      const customFunctions = options.functions
        ? await loadFunctions(options.functions)
        : undefined;

      // Render template
      const renderOptions = {};
      if (partials) renderOptions.partials = partials;
      if (customFunctions) renderOptions.functions = customFunctions;

      const result = parseAndRender(template, data, renderOptions);

      // Format output
      const output = formatOutput(result, {
        format: options.format,
        pretty: options.pretty,
        indent,
      });

      // Write output
      if (options.output) {
        fs.writeFileSync(options.output, output, "utf8");
      } else {
        process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
      }
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

await program.parseAsync();
