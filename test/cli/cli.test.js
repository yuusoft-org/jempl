import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(testDir, "../../src/cli.js");
const packagePath = path.resolve(testDir, "../../package.json");
const fixture = (name) => path.join(testDir, "fixtures", name);

function runCLI(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    input: options.input,
    cwd: options.cwd,
  });
  if (result.error) throw result.error;
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.status,
  };
}

describe("CLI", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jempl-cli-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Basic usage", () => {
    it("renders template and data files", () => {
      const result = runCLI([fixture("template.json"), fixture("data.json")]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        greeting: "Hello, World!",
        age: 25,
        items: ["apple", "banana", "cherry"],
      });
    });

    it("reads existing extensionless template and data filenames", () => {
      fs.writeFileSync(
        path.join(tempDir, "template"),
        '{"message":"Hi ${name}"}',
      );
      fs.writeFileSync(path.join(tempDir, "data"), '{"name":"World"}');
      const result = runCLI(["template", "data"], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ message: "Hi World" });
    });

    it("renders a template file with raw JSON data", () => {
      const result = runCLI([
        fixture("template.json"),
        '{"name":"Alice","age":30,"items":["one","two"]}',
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        greeting: "Hello, Alice!",
        age: 30,
        items: ["one", "two"],
      });
    });

    it("renders a raw template with file data", () => {
      const result = runCLI(['{"message":"Hi ${name}"}', fixture("data.json")]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ message: "Hi World" });
    });

    it("renders both raw template and data", () => {
      const result = runCLI(['{"message":"${msg}"}', '{"msg":"test"}']);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ message: "test" });
    });

    it("renders a template without a data argument", () => {
      const result = runCLI(['{"message":"static"}']);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ message: "static" });
    });
  });

  describe("Format detection and conversion", () => {
    it.each([
      ["template.json", "data.yaml"],
      ["template.yaml", "data.json"],
      ["template.yaml", "data.yaml"],
    ])("renders %s with %s", (template, data) => {
      const result = runCLI([fixture(template), fixture(data)]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).greeting).toBe("Hello, World!");
    });

    it("parses raw YAML whose final scalar resembles a JSON filename", () => {
      const result = runCLI([
        '{"file":"${file}"}',
        "name: Alice\nfile: report.json",
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ file: "report.json" });
    });
  });

  describe("Output options", () => {
    it("writes to an output file", () => {
      const outputPath = path.join(tempDir, "output.json");
      const result = runCLI([
        fixture("template.json"),
        fixture("data.json"),
        "-o",
        outputPath,
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(fs.readFileSync(outputPath, "utf8")).greeting).toBe(
        "Hello, World!",
      );
    });

    it("outputs pretty JSON", () => {
      const result = runCLI([
        fixture("template.json"),
        fixture("data.json"),
        "--pretty",
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("\n");
      expect(result.stdout).toContain("  ");
      expect(JSON.parse(result.stdout).greeting).toBe("Hello, World!");
    });

    it("outputs YAML", () => {
      const result = runCLI([
        fixture("template.json"),
        fixture("data.json"),
        "--format",
        "yaml",
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("greeting:");
      expect(result.stdout).toContain("Hello, World!");
    });

    it("writes exactly one trailing newline for YAML stdout", () => {
      const result = runCLI(['{"x":1}', "--format", "yaml"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("x: 1\n");
    });

    it("rejects an unsupported output format", () => {
      const result = runCLI([
        fixture("template.json"),
        fixture("data.json"),
        "--format",
        "toml",
      ]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toMatch(/format/i);
    });

    it("uses custom indentation", () => {
      const result = runCLI([
        fixture("template.json"),
        fixture("data.json"),
        "--pretty",
        "--indent",
        "4",
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("    ");
    });

    it("rejects invalid indentation", () => {
      const result = runCLI([
        fixture("template.json"),
        fixture("data.json"),
        "--pretty",
        "--indent",
        "abc",
      ]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toMatch(/indent/i);
    });
  });

  describe("Stdin support", () => {
    it("reads a template from stdin", () => {
      const result = runCLI(["-", '{"name":"Ada"}'], {
        input: '{"greeting":"Hello ${name}"}',
      });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ greeting: "Hello Ada" });
    });

    it("reads JSON data from stdin", () => {
      const input = JSON.stringify({
        name: "StdinUser",
        age: 35,
        items: ["x", "y"],
      });
      const result = runCLI([fixture("template.json"), "-"], { input });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).greeting).toBe("Hello, StdinUser!");
    });

    it("reads YAML data from stdin", () => {
      const input = "name: YamlUser\nage: 40\nitems:\n  - a\n  - b";
      const result = runCLI([fixture("template.json"), "-"], { input });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).age).toBe(40);
    });

    it("rejects using stdin for both template and data", () => {
      const result = runCLI(["-", "-"], { input: "{}" });
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toMatch(/cannot both read from stdin/i);
    });
  });

  describe("Partials and custom functions", () => {
    it("loads partials from a file", () => {
      const template =
        '{"header":{"$partial":"header"},"footer":{"$partial":"footer"}}';
      const result = runCLI([template, "{}", "-p", fixture("partials.json")]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        header: "Welcome Header",
        footer: "Copyright 2024",
      });
    });

    it("loads custom functions from a file", () => {
      const template = '{"upper":"${upper(name)}","doubled":"${double(age)}"}';
      const result = runCLI([
        template,
        '{"name":"hello","age":5}',
        "--functions",
        fixture("functions.js"),
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        upper: "HELLO",
        doubled: 10,
      });
    });

    it("loads a functions module whose path contains # and spaces", () => {
      const functionsPath = path.join(tempDir, "functions #1.mjs");
      fs.copyFileSync(fixture("functions.js"), functionsPath);
      const result = runCLI([
        '{"upper":"${upper(name)}"}',
        '{"name":"hello"}',
        "--functions",
        functionsPath,
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ upper: "HELLO" });
    });
  });

  describe("Complex scenarios", () => {
    it("handles conditionals", () => {
      const template =
        '{"$if show":{"result":"${value}"},"$else":{"result":"hidden"}}';
      const visible = runCLI([template, '{"show":true,"value":"visible"}']);
      const hidden = runCLI([template, '{"show":false,"value":"visible"}']);
      expect(visible.exitCode).toBe(0);
      expect(hidden.exitCode).toBe(0);
      expect(JSON.parse(visible.stdout).result).toBe("visible");
      expect(JSON.parse(hidden.stdout).result).toBe("hidden");
    });

    it("handles loops", () => {
      const template = '[{"$each":"user in users","name":"${user.name}"}]';
      const data = '{"users":[{"name":"Alice"},{"name":"Bob"}]}';
      const result = runCLI([template, data]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        { name: "Alice" },
        { name: "Bob" },
      ]);
    });

    it("handles nested templates", () => {
      const template =
        '{"user":{"greeting":"Hello ${user.name}","age":"${user.age}"}}';
      const result = runCLI([template, '{"user":{"name":"John","age":25}}']);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).user).toEqual({
        greeting: "Hello John",
        age: 25,
      });
    });

    it("handles all options together", () => {
      const outputPath = path.join(tempDir, "output.json");
      const template =
        '{"header":{"$partial":"header"},"name":"${upper(name)}"}';
      const result = runCLI([
        template,
        '{"name":"test"}',
        "-p",
        fixture("partials.json"),
        "--functions",
        fixture("functions.js"),
        "--pretty",
        "-o",
        outputPath,
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(fs.readFileSync(outputPath, "utf8"))).toEqual({
        header: "Welcome Header",
        name: "TEST",
      });
    });
  });

  describe("Errors and metadata", () => {
    it("reports invalid template input", () => {
      const result = runCLI(["[invalid", "{}"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Error:");
    });

    it("reports an explicitly named missing template file", () => {
      const missingPath = path.join(tempDir, "missing-template.json");
      const result = runCLI([missingPath, "{}"]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(missingPath);
      expect(result.stderr).toMatch(/not found|does not exist|ENOENT/i);
    });

    it("rejects an empty YAML template", () => {
      const templatePath = path.join(tempDir, "empty.yaml");
      fs.writeFileSync(templatePath, "");
      const result = runCLI([templatePath]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Error:");
    });

    it("serializes a missing root binding as valid JSON", () => {
      const result = runCLI(["${missing}"]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({});
    });

    it("reports an invalid partials file", () => {
      const result = runCLI([
        "{}",
        "{}",
        "-p",
        path.join(tempDir, "missing.json"),
      ]);
      expect(result.exitCode).not.toBe(0);
    });

    it("reports an invalid functions file", () => {
      const result = runCLI([
        "{}",
        "{}",
        "--functions",
        path.join(tempDir, "missing.mjs"),
      ]);
      expect(result.exitCode).not.toBe(0);
    });

    it("reports the package version", () => {
      const expectedVersion = JSON.parse(
        fs.readFileSync(packagePath, "utf8"),
      ).version;
      const result = runCLI(["--version"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(expectedVersion);
      expect(result.stderr).toBe("");
    });
  });
});
