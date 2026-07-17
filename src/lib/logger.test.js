import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger.js";

describe("logger", () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("in development mode", () => {
    beforeEach(() => {
      import.meta.env.DEV = true;
    });

    it("error() logs to console.error with prefix, message, and error", () => {
      const err = new Error("boom");
      logger.error("Something failed", err);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "🔴 [Error]",
        "Something failed",
        err,
      );
    });

    it("warn() logs to console.warn with prefix, message, and data", () => {
      const data = { code: 42 };
      logger.warn("Careful", data);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("🟡 [Warning]", "Careful", data);
    });

    it("info() logs to console.info with prefix, message, and data", () => {
      const data = { userId: 1 };
      logger.info("User loaded", data);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledWith("🔵 [Info]", "User loaded", data);
    });

    it("debug() logs to console.debug with prefix, message, and data", () => {
      const data = { step: "init" };
      logger.debug("Debugging", data);
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).toHaveBeenCalledWith("🟣 [Debug]", "Debugging", data);
    });

    it("handles calls made with only a message and no data/error argument", () => {
      logger.error("Just a message");
      logger.warn("Just a message");
      logger.info("Just a message");
      logger.debug("Just a message");

      expect(consoleErrorSpy).toHaveBeenCalledWith("🔴 [Error]", "Just a message", undefined);
      expect(consoleWarnSpy).toHaveBeenCalledWith("🟡 [Warning]", "Just a message", undefined);
      expect(consoleInfoSpy).toHaveBeenCalledWith("🔵 [Info]", "Just a message", undefined);
      expect(consoleDebugSpy).toHaveBeenCalledWith("🟣 [Debug]", "Just a message", undefined);
    });
  });

  describe("in production mode", () => {
    beforeEach(() => {
      import.meta.env.DEV = false;
    });

    it("error() does not log to console in production", () => {
      logger.error("Something failed", new Error("boom"));
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("warn() does not log to console in production", () => {
      logger.warn("Careful", { code: 42 });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("info() does not log to console in production", () => {
      logger.info("User loaded", { userId: 1 });
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("debug() does not log to console in production", () => {
      logger.debug("Debugging", { step: "init" });
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });
});
