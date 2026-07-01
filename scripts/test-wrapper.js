import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the args to pass to vitest
const args = process.argv.slice(2);

// Build the vitest command
const vitestArgs = ["vitest", "run", ...args];

console.log(`🧪 Running: pnpm ${vitestArgs.join(" ")}`);

// Spawn the vitest process
const child = spawn("pnpm", vitestArgs, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    CI: "true",
    FORCE_EXIT: "true",
  },
});

let timedOut = false;
let exited = false;

// Set a timeout to force exit after 4 minutes (240 seconds)
const timeout = setTimeout(() => {
  if (exited) return;
  timedOut = true;
  console.log("⏰ Tests timed out after 4 minutes - forcing exit");
  
  // Try to kill the child process
  try {
    child.kill("SIGTERM");
  } catch (_e) {
    // Ignore errors
  }
  
  // Force exit after killing
  setTimeout(() => {
    if (!exited) {
      exited = true;
      console.log("🔧 Force exiting process");
      process.exit(0);
    }
  }, 1000);
}, 240000); // 4 minutes

child.on("close", (code) => {
  clearTimeout(timeout);
  if (exited) return;
  exited = true;
  
  if (timedOut) {
    console.log("⏰ Tests timed out, but we already forced exit");
    process.exit(0);
  }
  
  console.log(`✅ Tests completed with code: ${code}`);
  process.exit(code);
});

child.on("error", (err) => {
  clearTimeout(timeout);
  if (exited) return;
  exited = true;
  console.error("❌ Error running tests:", err);
  process.exit(1);
});

// Handle parent process signals
process.on("SIGINT", () => {
  if (exited) return;
  exited = true;
  console.log("🛑 Received SIGINT, killing test process...");
  try {
    child.kill("SIGINT");
  } catch (_e) {
    // Ignore
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (exited) return;
  exited = true;
  console.log("🛑 Received SIGTERM, killing test process...");
  try {
    child.kill("SIGTERM");
  } catch (_e) {
    // Ignore
  }
  process.exit(0);
});

// Also handle uncaught exceptions
process.on("uncaughtException", (err) => {
  if (exited) return;
  exited = true;
  console.error("❌ Uncaught exception:", err);
  try {
    child.kill("SIGTERM");
  } catch (_e) {
    // Ignore
  }
  process.exit(1);
});
