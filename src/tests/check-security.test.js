/**
 * Tests for scripts/check-security.js
 *
 * The script is a side-effect-only CLI script: it reads process.env/argv,
 * shells out to `find`, reads matched files, and calls process.exit().
 * It exports nothing, so each test:
 *   1. Sets process.env.NODE_ENV / process.argv as needed
 *   2. Configures the mocked modules
 *   3. Dynamically imports the script, then flushes microtasks
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SCRIPT_PATH = "../../scripts/check-security.js";

// ✅ Use importOriginal pattern for node:fs with default export
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: actual,
    execSync: vi.fn(),
  };
});

// ✅ Import the mocked modules once at the top
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

let exitSpy;
let originalArgv;

beforeEach(() => {
  originalArgv = [...process.argv];
  exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});
  // ✅ Clear mock calls and reset implementations
  vi.clearAllMocks();
});

afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/**
 * Configures the mocks and imports the script.
 */
async function run({
  execOutput = "",
  execImpl,
  existsImpl,
  existsReturn = true,
  readImpl,
  readReturn = "",
} = {}) {
  // ✅ Reset mock implementations (not the mock itself)
  execSync.mockReset();
  existsSync.mockReset();
  readFileSync.mockReset();

  if (execImpl) {
    execSync.mockImplementation(execImpl);
  } else {
    execSync.mockReturnValue(execOutput);
  }

  if (existsImpl) {
    existsSync.mockImplementation(existsImpl);
  } else {
    existsSync.mockReturnValue(existsReturn);
  }

  if (readImpl) {
    readFileSync.mockImplementation(readImpl);
  } else {
    readFileSync.mockReturnValue(readReturn);
  }

  // Re-spy on exit fresh
  exitSpy.mockClear();

  // ✅ Import the script - it will use the mocked modules
  await import(SCRIPT_PATH);
  await flush();

  return { fsMod: { existsSync, readFileSync }, cpMod: { execSync } };
}

describe("check-security - early exit conditions", () => {
  it("does nothing when NODE_ENV is not production and --build is not passed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.argv = ["node", "check-security.js"];

    const { fsMod, cpMod } = await run();

    expect(cpMod.execSync).not.toHaveBeenCalled();
    expect(fsMod.readFileSync).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("runs the scan when NODE_ENV=production even without --build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.argv = ["node", "check-security.js"];

    const { cpMod } = await run({ execOutput: "" });

    expect(cpMod.execSync).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("runs the scan when --build is passed even if NODE_ENV isn't production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    process.argv = ["node", "check-security.js", "--build"];

    const { cpMod } = await run({ execOutput: "" });

    expect(cpMod.execSync).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe("check-security - find invocation", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.argv = ["node", "check-security.js"];
  });

  it("invokes find scoped to dist and src for js/jsx/html files", async () => {
    const { cpMod } = await run({ execOutput: "" });

    expect(cpMod.execSync).toHaveBeenCalledWith(
      expect.stringContaining("find dist src"),
      expect.objectContaining({ encoding: "utf8" }),
    );
  });

  it("exits 1 when the find command throws", async () => {
    await run({
      execImpl: () => {
        throw new Error("find: command not found");
      },
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 0 when no files are found", async () => {
    const { fsMod } = await run({ execOutput: "" });

    expect(fsMod.readFileSync).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("filters out blank lines from the find output", async () => {
    const { fsMod } = await run({ execOutput: "\n\nsrc/foo.js\n\n" });

    expect(fsMod.readFileSync).toHaveBeenCalledWith("src/foo.js", "utf8");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe("check-security - critical SECURITY_PATTERNS", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.argv = ["node", "check-security.js"];
  });

  it("flags a leftover admin123 credential", async () => {
    await run({
      execOutput: "src/config.js\n",
      readReturn: 'const password = "admin123";',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("flags a leftover user123 credential", async () => {
    await run({
      execOutput: "src/config.js\n",
      readReturn: 'const password = "user123";',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("flags the username.toLowerCase() === \"admin\" login check pattern", async () => {
    await run({
      execOutput: "src/login.jsx\n",
      readReturn: 'if (username.toLowerCase() === "admin") { grant(); }',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("flags the password === \"admin123\" comparison pattern", async () => {
    await run({
      execOutput: "src/config.js\n",
      readReturn: 'if (password === "admin123") { grant(); }',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("flags the password === \"user123\" comparison pattern", async () => {
    await run({
      execOutput: "src/config.js\n",
      readReturn: 'if (password === "user123") { grant(); }',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does not flag clean files", async () => {
    await run({
      execOutput: "src/components/Foo.jsx\n",
      readReturn: "export const Foo = () => <div>hello</div>;",
    });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("does not throw when a match occurs at the very start of the file", async () => {
    await expect(
      run({
        execOutput: "src/edge.js\n",
        readReturn: "admin123 leftover token at position zero",
      }),
    ).resolves.toBeDefined();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("calls process.exit exactly once even with multiple violations across files", async () => {
    await run({
      execOutput: "a.js\nb.js\n",
      readReturn: 'const password = "admin123"; const other = "user123";',
    });
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("check-security - ROLE_PATTERNS scoped to auth-context files", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.argv = ["node", "check-security.js"];
  });

  it("flags a hardcoded admin username check inside AuthContext.jsx", async () => {
    await run({
      execOutput: "src/context/AuthContext.jsx\n",
      readReturn: 'if (username === "admin") { grantAccess(); }',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("flags a hardcoded admin password check inside authService.js", async () => {
    await run({
      execOutput: "src/services/authService.js\n",
      readReturn: 'if (password === "admin") { grantAccess(); }',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("flags an auth-admin pattern inside auth.js", async () => {
    await run({
      execOutput: "src/auth.js\n",
      readReturn: 'function checkAuthForAdmin() { return auth.admin; }',
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("flags a login-admin pattern inside login.js", async () => {
    await run({
      execOutput: "src/login.js\n",
      readReturn: "function loginAsAdmin() { /* login admin bypass */ }",
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does not flag a plain role label without a credential comparison", async () => {
    await run({
      execOutput: "src/context/AuthContext.jsx\n",
      readReturn: 'const defaultRole = "admin";',
    });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("does not check role patterns in files outside the auth-context list", async () => {
    await run({
      execOutput: "src/components/UserBadge.jsx\n",
      readReturn: 'const role = "admin"; if (username === "admin") {}',
    });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe("check-security - ALLOWED_FILES exclusions", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.argv = ["node", "check-security.js"];
  });

  it.each([
    ["scripts/check-security.js", "scripts/check-security.js"],
    ["README.md", "README.md"],
    ["BATCH_1_2_IMPLEMENTATION.md", "BATCH_1_2_IMPLEMENTATION.md"],
    ["a test file under src/tests/", "src/tests/foo.test.js"],
    ["the settings context file", "src/context/SettingsContext.jsx"],
  ])("skips %s without reading its contents", async (_label, filePath) => {
    const { fsMod } = await run({
      execOutput: `${filePath}\n`,
      readReturn: 'const password = "admin123";',
    });

    expect(fsMod.readFileSync).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("still flags violations in non-allowed files alongside allowed ones", async () => {
    await run({
      execOutput: "src/tests/foo.test.js\nsrc/real-leak.js\n",
      readImpl: (file) => {
        if (file === "src/real-leak.js") return 'const password = "admin123";';
        return "";
      },
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("check-security - filesystem edge cases", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.argv = ["node", "check-security.js"];
  });

  it("skips files that no longer exist on disk", async () => {
    const { fsMod } = await run({
      execOutput: "src/deleted-file.js\n",
      existsReturn: false,
    });

    expect(fsMod.readFileSync).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("continues scanning after a single file read error", async () => {
    await run({
      execOutput: "src/unreadable.js\nsrc/bad.js\n",
      readImpl: (file) => {
        if (file === "src/unreadable.js") {
          throw new Error("EACCES: permission denied");
        }
        return 'const password = "admin123";';
      },
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles a mix of existing and missing files without crashing", async () => {
    await run({
      execOutput: "src/exists.js\nsrc/missing.js\n",
      existsImpl: (file) => file === "src/exists.js",
      readReturn: "clean content",
    });

    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
