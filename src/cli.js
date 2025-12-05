#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { parseAndRender } from "./index.js";

const program = new Command();

// Helper to check if a string is likely a file path
function isFilePath(str) {
  if (!str || str === "-") return false;
  // Check if it has a file extension or path separator
  if (str.includes(path.sep) || str.includes("/")) return true;
  if (str.includes(".") && !str.startsWith("{") && !str.startsWith("[")) {
    return true;
  }
  return false;
}

// Helper to read input (file, stdin, or raw string)
async function readInput(input, isStdin = false) {
  if (isStdin || input === "-") {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    });
  }

  if (isFilePath(input)) {
    // Try to read as file
    try {
      return fs.readFileSync(input, "utf8");
    } catch (err) {
      if (err.code === "ENOENT") {
        // File doesn't exist, treat as raw string
        return input;
      }
      throw err;
    }
  }

  // Return as raw string
  return input;
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
  if (format === "json") {
    return JSON.parse(str);
  }
  if (format === "yaml") {
    return yaml.load(str);
  }

  // Auto-detect: try JSON first, then YAML
  try {
    return JSON.parse(str);
  } catch {
    try {
      return yaml.load(str);
    } catch {
      throw new Error("Failed to parse data as JSON or YAML");
    }
  }
}

// Helper to format output
function formatOutput(data, options) {
  const format = options.format || "json";

  if (format === "yaml") {
    return yaml.dump(data, {
      indent: options.indent || 2,
      lineWidth: -1,
      noRefs: true,
    });
  }

  // JSON output
  if (options.pretty) {
    return JSON.stringify(data, null, options.indent || 2);
  }

  return JSON.stringify(data);
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

  const absolutePath = path.resolve(functionsPath);
  // Dynamic import for ES modules
  return import(absolutePath).then((mod) => mod.default || mod);
}

// Main CLI command
program
  .name("jempl")
  .description("A JSON templating engine with conditionals, loops, and custom functions")
  .version("1.0.1")
  .argument("<template>", "Template file path or raw template string")
  .argument("[data]", "Data file path, raw data string, or '-' for stdin")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("-f, --format <format>", "Output format: json or yaml (default: json)", "json")
  .option("-p, --partials <file>", "Partials file path (JSON or YAML)")
  .option("--functions <file>", "Custom functions file path (JS module)")
  .option("--pretty", "Pretty-print JSON output", false)
  .option("--indent <number>", "Indentation spaces for pretty output", "2")
  .action(async (templateArg, dataArg, options) => {
    try {
      // Read template
      const templateStr = await readInput(templateArg);

      // Detect template format
      const templateFormat = detectFormat(templateArg);
      const template = parseData(templateStr, templateFormat);

      // Read data
      let data = {};
      if (dataArg) {
        const dataStr = await readInput(dataArg, dataArg === "-");
        const dataFormat = detectFormat(dataArg);
        data = parseData(dataStr, dataFormat);
      }

      // Load partials
      const partials = loadPartials(options.partials);

      // Load custom functions
      const customFunctions = options.functions
        ? await loadFunctions(options.functions)
        : undefined;

      // Parse indent option
      const indent = parseInt(options.indent, 10);

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
        console.log(output);
      }
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();
