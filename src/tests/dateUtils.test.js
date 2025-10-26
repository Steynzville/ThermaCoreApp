import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDisplayDate, getCurrentTimestamp } from "../utils/dateUtils";

describe("dateUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatDisplayDate", () => {
    it("should format Date object with default options", () => {
      const date = new Date("2025-01-15T14:30:00.000Z");
      const formatted = formatDisplayDate(date);

      expect(formatted).toContain("Jan");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2025");
    });

    it("should format ISO string with default options", () => {
      const isoString = "2025-01-15T14:30:00.000Z";
      const formatted = formatDisplayDate(isoString);

      expect(formatted).toContain("Jan");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2025");
    });

    it("should apply custom formatting options", () => {
      const date = new Date("2025-01-15T14:30:00.000Z");
      const formatted = formatDisplayDate(date, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      expect(formatted).toContain("January");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2025");
    });

    it("should include time in formatted string by default", () => {
      const date = new Date("2025-01-15T14:30:00.000Z");
      const formatted = formatDisplayDate(date);

      // Time should be included in default format
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it("should handle time-only format option", () => {
      const date = new Date("2025-01-15T14:30:00.000Z");
      const formatted = formatDisplayDate(date, {
        hour: "2-digit",
        minute: "2-digit",
        year: undefined,
        month: undefined,
        day: undefined,
      });

      // Should contain time
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe("getCurrentTimestamp", () => {
    it("should return current timestamp in ISO format", () => {
      const now = new Date("2025-01-15T12:00:00.000Z");
      vi.setSystemTime(now);

      const timestamp = getCurrentTimestamp();

      expect(timestamp).toBe(now.toISOString());
      expect(timestamp).toContain("2025-01-15T12:00:00.000Z");
    });

    it("should return timestamp with milliseconds", () => {
      const now = new Date("2025-01-15T12:00:00.123Z");
      vi.setSystemTime(now);

      const timestamp = getCurrentTimestamp();

      expect(timestamp).toBe(now.toISOString());
      expect(timestamp).toContain(".123Z");
    });

    it("should return different timestamps when called at different times", () => {
      const time1 = new Date("2025-01-15T12:00:00.000Z");
      vi.setSystemTime(time1);
      const timestamp1 = getCurrentTimestamp();

      const time2 = new Date("2025-01-15T12:00:01.000Z");
      vi.setSystemTime(time2);
      const timestamp2 = getCurrentTimestamp();

      expect(timestamp1).not.toBe(timestamp2);
      expect(timestamp1).toBe(time1.toISOString());
      expect(timestamp2).toBe(time2.toISOString());
    });
  });
});
