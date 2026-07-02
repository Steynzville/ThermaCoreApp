// This file is a simple wrapper that runs vitest directly
// It's kept for compatibility with package.json scripts

import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);

console.log(`🧪 Running: vitest run ${args.join(" ")}`);

const child = spawn("vitest", ["run", ...args], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    CI: "true",
  },
});

child.on("close", (code) => {
  process.exit(code);
});

child.on("error", (err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
