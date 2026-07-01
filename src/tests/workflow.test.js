/**
 * Test workflow configuration and CI/CD setup for frontend
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowsDir = path.join(process.cwd(), ".github", "workflows");

describe("GitHub Workflows", () => {
  const workflowFiles = fs.existsSync(workflowsDir)
    ? fs
        .readdirSync(workflowsDir)
        .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    : [];

  it("should have at least one workflow file", () => {
    expect(workflowFiles.length).toBeGreaterThan(0);
  });

  it("should have workflows that define jobs", () => {
    const allContents = workflowFiles
      .map((file) => fs.readFileSync(path.join(workflowsDir, file), "utf8"))
      .join("\n");
    expect(allContents).toContain("jobs:");
  });

  it("should have frontend testing in at least one workflow", () => {
    const allContents = workflowFiles
      .map((file) => fs.readFileSync(path.join(workflowsDir, file), "utf8"))
      .join("\n");
      
    // Convert text to lowercase to ensure casing differences don't break the build
    const normalizedContents = allContents.toLowerCase();
    
    const hasFrontendTesting =
      normalizedContents.includes("frontend") ||
      normalizedContents.includes("vitest") ||
      normalizedContents.includes("test:coverage") ||
      normalizedContents.includes("pnpm test") ||
      normalizedContents.includes("npm test");
      
    expect(hasFrontendTesting).toBe(true);
  });
});

describe("Project Structure", () => {
  it("should have package.json", () => {
    const packagePath = path.join(process.cwd(), "package.json");
    expect(fs.existsSync(packagePath)).toBe(true);
  });

  it("should have test script configured", () => {
    const packagePath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
  });

  it("should have vite config", () => {
    const vitePath = path.join(process.cwd(), "vite.config.js");
    expect(fs.existsSync(vitePath)).toBe(true);
  });
});
