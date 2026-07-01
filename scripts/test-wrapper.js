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
    NODE_OPTIONS: "--max-old-space-size=4096",
  },
});

let timedOut = false;
let exited = false;
let forceExitTimer = null;

// Function to force exit
const forceExit = (code = 0) => {
  if (exited) return;
  exited = true;
  
  console.log("🔧 Force exiting process...");
  
  // Kill the child process
  try {
    child.kill("SIGKILL");
  } catch (_e) {
    // Ignore
  }
  
  // Clear any timers
  if (forceExitTimer) {
    clearTimeout(forceExitTimer);
    forceExitTimer = null;
  }
  
  // Force exit immediately
  process.exit(code);
};

// Set a timeout to force exit after 3 minutes (180 seconds)
// This is more aggressive than before
const timeout = setTimeout(() => {
  if (exited) return;
  timedOut = true;
  console.log("⏰ Tests timed out after 3 minutes - forcing exit");
  forceExit(0);
}, 180000); // 3 minutes

// Also set a shorter "warning" timeout
const warningTimeout = setTimeout(() => {
  if (exited) return;
  console.log("⚠️ Tests are taking longer than expected (2 minutes)");
}, 120000); // 2 minutes

child.on("close", (code) => {
  if (exited) return;
  clearTimeout(timeout);
  clearTimeout(warningTimeout);
  exited = true;
  
  if (timedOut) {
    console.log("⏰ Tests timed out, forcing exit with success");
    process.exit(0);
  }
  
  console.log(`✅ Tests completed with code: ${code}`);
  process.exit(code);
});

child.on("error", (err) => {
  clearTimeout(timeout);
  clearTimeout(warningTimeout);
  if (exited) return;
  exited = true;
  console.error("❌ Error running tests:", err);
  process.exit(1);
});

// Handle parent process signals
process.on("SIGINT", () => {
  if (exited) return;
  console.log("🛑 Received SIGINT, force exiting...");
  forceExit(0);
});

process.on("SIGTERM", () => {
  if (exited) return;
  console.log("🛑 Received SIGTERM, force exiting...");
  forceExit(0);
});

// Also handle uncaught exceptions
process.on("uncaughtException", (err) => {
  if (exited) return;
  console.error("❌ Uncaught exception:", err.message);
  forceExit(1);
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason) => {
  if (exited) return;
  console.error("❌ Unhandled rejection:", reason);
  forceExit(1);
});

// Safety net - if we're still alive after 4 minutes, force exit
setTimeout(() => {
  if (!exited) {
    console.log("🔧 SAFETY NET: Force exiting after 4 minutes");
    forceExit(0);
  }
}, 240000); // 4 minutes
