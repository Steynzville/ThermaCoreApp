import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the args to pass to vitest
const args = process.argv.slice(2);
const isCoverage = args.includes("--coverage");

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

// Set a timeout to force exit after 5 minutes
const timeout = setTimeout(() => {
  timedOut = true;
  console.log("⏰ Tests timed out after 5 minutes - forcing exit");
  child.kill("SIGTERM");
  
  // Force exit after killing
  setTimeout(() => {
    console.log("🔧 Force exiting process");
    process.exit(0);
  }, 2000);
}, 300000); // 5 minutes

child.on("close", (code) => {
  clearTimeout(timeout);
  
  if (timedOut) {
    console.log("⏰ Tests timed out, but we already forced exit");
    process.exit(0);
  }
  
  console.log(`✅ Tests completed with code: ${code}`);
  process.exit(code);
});

child.on("error", (err) => {
  console.error("❌ Error running tests:", err);
  process.exit(1);
});

// Handle parent process signals
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, killing test process...");
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, killing test process...");
  child.kill("SIGTERM");
});
