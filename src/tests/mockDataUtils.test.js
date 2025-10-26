import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateTimestamp } from "../utils/mockDataUtils";

describe("mockDataUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("generateTimestamp", () => {
    it("should generate current timestamp when offset is 0", () => {
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.setSystemTime(now);

      const timestamp = generateTimestamp(0);
      expect(timestamp).toBe(now.toISOString());
    });

    it("should generate timestamp in the past with positive offset", () => {
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.setSystemTime(now);

      const oneHourAgo = 60 * 60 * 1000; // 1 hour in milliseconds
      const timestamp = generateTimestamp(oneHourAgo);

      const expected = new Date(now.getTime() - oneHourAgo).toISOString();
      expect(timestamp).toBe(expected);
    });

    it("should generate default timestamp when no offset provided", () => {
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.setSystemTime(now);

      const timestamp = generateTimestamp();
      expect(timestamp).toBe(now.toISOString());
    });

    it("should handle large offsets correctly", () => {
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.setSystemTime(now);

      const oneWeekAgo = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
      const timestamp = generateTimestamp(oneWeekAgo);

      const expected = new Date(now.getTime() - oneWeekAgo).toISOString();
      expect(timestamp).toBe(expected);
    });

    it("should return valid ISO 8601 timestamp format", () => {
      const timestamp = generateTimestamp(1000);
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(timestamp).toMatch(isoRegex);
    });

    it("should generate chronological timestamps for event history", () => {
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.setSystemTime(now);

      const totalEvents = 5;
      const dayMs = 24 * 60 * 60 * 1000;

      const timestamps = [];
      for (let i = 0; i < totalEvents; i++) {
        // Oldest to newest pattern
        timestamps.push(generateTimestamp((totalEvents - i) * dayMs));
      }

      // Verify chronological ordering (oldest to newest)
      for (let i = 1; i < timestamps.length; i++) {
        const prevTime = new Date(timestamps[i - 1]).getTime();
        const currTime = new Date(timestamps[i]).getTime();
        expect(currTime).toBeGreaterThan(prevTime);
      }
    });

    it("should handle zero offset consistently", () => {
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.setSystemTime(now);

      const timestamp1 = generateTimestamp(0);
      const timestamp2 = generateTimestamp();

      expect(timestamp1).toBe(timestamp2);
    });

    it("should create unique timestamps for different offsets", () => {
      const now = new Date("2025-01-01T12:00:00.000Z");
      vi.setSystemTime(now);

      const timestamp1 = generateTimestamp(1000);
      const timestamp2 = generateTimestamp(2000);

      expect(timestamp1).not.toBe(timestamp2);
      expect(new Date(timestamp2).getTime()).toBeLessThan(
        new Date(timestamp1).getTime(),
      );
    });
  });
});
