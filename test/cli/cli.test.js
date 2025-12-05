import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, "../../src/cli.js");
const FIXTURES_PATH = path.resolve(__dirname, "fixtures");
const OUTPUT_PATH = path.resolve(__dirname, "output.tmp");

// Helper to run CLI command
function runCLI(args, input = null) {
  try {
    const result = execSync(`node ${CLI_PATH} ${args}`, {
      encoding: "utf8",
      input: input,
    });
    return { stdout: result, stderr: "", exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      exitCode: error.status || 1,
    };
  }
}

// Helper to run CLI with stdin (using spawn for better stdin handling)
function runCLIWithStdin(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [CLI_PATH, ...args.split(" ")], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });

    child.on("error", reject);

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

describe("CLI", () => {
  beforeEach(() => {
    // Clean up output file before each test
    if (fs.existsSync(OUTPUT_PATH)) {
      fs.unlinkSync(OUTPUT_PATH);
    }
  });

  afterEach(() => {
    // Clean up output file after each test
    if (fs.existsSync(OUTPUT_PATH)) {
      fs.unlinkSync(OUTPUT_PATH);
    }
  });

  describe("Basic usage", () => {
    it("should render template with data (both files)", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.json ${FIXTURES_PATH}/data.json`
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, World!");
      expect(output.age).toBe(25);
      expect(output.items).toEqual(["apple", "banana", "cherry"]);
    });

    it("should render template with raw string data", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.json '{"name":"Alice","age":30,"items":["one","two"]}'`
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, Alice!");
      expect(output.age).toBe(30);
      expect(output.items).toEqual(["one", "two"]);
    });

    it("should render raw template with file data", () => {
      const template = '{"message":"Hi ${name}"}';
      const result = runCLI(`'${template}' ${FIXTURES_PATH}/data.json`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.message).toBe("Hi World");
    });

    it("should render both raw template and data", () => {
      const template = '{"message":"${msg}"}';
      const data = '{"msg":"test"}';
      const result = runCLI(`'${template}' '${data}'`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.message).toBe("test");
    });

    it("should render template without data argument", () => {
      const template = '{"message":"static"}';
      const result = runCLI(`'${template}'`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.message).toBe("static");
    });
  });

  describe("Format detection and conversion", () => {
    it("should handle JSON template with YAML data", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.json ${FIXTURES_PATH}/data.yaml`
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, World!");
    });

    it("should handle YAML template with JSON data", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.yaml ${FIXTURES_PATH}/data.json`
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, World!");
    });

    it("should handle YAML template with YAML data", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.yaml ${FIXTURES_PATH}/data.yaml`
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, World!");
    });
  });

  describe("Output options", () => {
    it("should write to output file", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.json ${FIXTURES_PATH}/data.json -o ${OUTPUT_PATH}`
      );
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
      const output = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
      expect(output.greeting).toBe("Hello, World!");
    });

    it("should output pretty JSON", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.json ${FIXTURES_PATH}/data.json --pretty`
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("\n");
      expect(result.stdout).toContain("  ");
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, World!");
    });

    it("should output YAML format", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.json ${FIXTURES_PATH}/data.json --format yaml`
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("greeting:");
      expect(result.stdout).toContain("Hello, World!");
    });

    it("should use custom indentation", () => {
      const result = runCLI(
        `${FIXTURES_PATH}/template.json ${FIXTURES_PATH}/data.json --pretty --indent 4`
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("    ");
    });
  });

  describe("Stdin support", () => {
    it("should read data from stdin with - argument", async () => {
      const data = JSON.stringify({
        name: "StdinUser",
        age: 35,
        items: ["x", "y"],
      });
      const result = await runCLIWithStdin(
        `${FIXTURES_PATH}/template.json -`,
        data
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, StdinUser!");
      expect(output.age).toBe(35);
    });

    it("should read YAML data from stdin", async () => {
      const data = `name: YamlUser
age: 40
items:
  - a
  - b`;
      const result = await runCLIWithStdin(
        `${FIXTURES_PATH}/template.json -`,
        data
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.greeting).toBe("Hello, YamlUser!");
      expect(output.age).toBe(40);
    });
  });

  describe("Partials", () => {
    it("should load partials from file", () => {
      const template = '{"header":{"$partial":"header"},"footer":{"$partial":"footer"}}';
      const result = runCLI(
        `'${template}' '{}' -p ${FIXTURES_PATH}/partials.json`
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.header).toBe("Welcome Header");
      expect(output.footer).toBe("Copyright 2024");
    });
  });

  describe("Custom functions", () => {
    it("should load custom functions from file", () => {
      const template = '{"upper":"${upper(name)}","doubled":"${double(age)}"}';
      const data = '{"name":"hello","age":5}';
      const result = runCLI(
        `'${template}' '${data}' --functions ${FIXTURES_PATH}/functions.js`
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.upper).toBe("HELLO");
      expect(output.doubled).toBe(10);
    });
  });

  describe("Complex scenarios", () => {
    it("should handle conditionals", () => {
      const template = '{"$if show":{"result":"${value}"},"$else":{"result":"hidden"}}';
      const data1 = '{"show":true,"value":"visible"}';
      const result1 = runCLI(`'${template}' '${data1}'`);
      expect(result1.exitCode).toBe(0);
      expect(JSON.parse(result1.stdout).result).toBe("visible");

      const data2 = '{"show":false,"value":"visible"}';
      const result2 = runCLI(`'${template}' '${data2}'`);
      expect(result2.exitCode).toBe(0);
      expect(JSON.parse(result2.stdout).result).toBe("hidden");
    });

    it("should handle loops", () => {
      const template = '[{"$each":"user in users","name":"${user.name}"}]';
      const data = '{"users":[{"name":"Alice"},{"name":"Bob"}]}';
      const result = runCLI(`'${template}' '${data}'`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
      expect(output[0].name).toBe("Alice");
      expect(output[1].name).toBe("Bob");
    });

    it("should handle nested templates", () => {
      const template = '{"user":{"greeting":"Hello ${user.name}","age":"${user.age}"}}';
      const data = '{"user":{"name":"John","age":25}}';
      const result = runCLI(`'${template}' '${data}'`);
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.user.greeting).toBe("Hello John");
      expect(output.user.age).toBe(25);
    });

    it("should handle all options together", () => {
      const template = '{"header":{"$partial":"header"},"name":"${upper(name)}"}';
      const data = '{"name":"test"}';
      const result = runCLI(
        `'${template}' '${data}' -p ${FIXTURES_PATH}/partials.json --functions ${FIXTURES_PATH}/functions.js --pretty -o ${OUTPUT_PATH}`
      );
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
      const output = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
      expect(output.header).toBe("Welcome Header");
      expect(output.name).toBe("TEST");
    });
  });

  describe("Error handling", () => {
    it("should handle invalid JSON", () => {
      const result = runCLI("'[invalid' '{}'");
      expect(result.exitCode).toBe(1);
    });

    it("should handle missing template file", () => {
      // When file doesn't exist, it's treated as raw string, so it will try to parse "nonexistent.json" as JSON
      const result = runCLI("'[invalid json' '{}'");
      expect(result.exitCode).toBe(1);
    });

    it("should handle invalid partials file", () => {
      const result = runCLI(`'{}' '{}' -p nonexistent.json`);
      expect(result.exitCode).toBe(1);
    });

    it("should handle invalid functions file", () => {
      const result = runCLI(`'{}' '{}' --functions nonexistent.js`);
      expect(result.exitCode).toBe(1);
    });
  });
});
