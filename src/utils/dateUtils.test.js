import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatDisplayDate, getCurrentTimestamp } from "../utils/dateUtils";

describe("dateUtils", () => {
  describe("formatDisplayDate", () => {
    beforeEach(() => {
      // Set up a consistent timezone for tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:30:45Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("Basic Formatting", () => {
      it("should format Date object", () => {
        const date = new Date("2024-01-15T10:30:00");
        const result = formatDisplayDate(date);
        expect(result).toContain("Jan");
        expect(result).toContain("15");
        expect(result).toContain("2024");
      });

      it("should format ISO string", () => {
        const isoString = "2024-01-15T10:30:00Z";
        const result = formatDisplayDate(isoString);
        expect(result).toContain("Jan");
        expect(result).toContain("15");
        expect(result).toContain("2024");
      });

      it("should include time in default format", () => {
        const date = new Date("2024-01-15T14:30:00");
        const result = formatDisplayDate(date);
        expect(result).toMatch(/\d{1,2}:\d{2}/); // Should contain time
      });
    });

    describe("Custom Options", () => {
      it("should accept custom formatting options", () => {
        const date = new Date("2024-01-15T10:30:00");
        const result = formatDisplayDate(date, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        expect(result).toContain("January");
        expect(result).toContain("15");
        expect(result).toContain("2024");
      });

      it("should format with short month", () => {
        const date = new Date("2024-01-15T10:30:00");
        const result = formatDisplayDate(date, {
          month: "short",
        });
        expect(result).toContain("Jan");
      });

      it("should format with numeric month", () => {
        const date = new Date("2024-01-15T10:30:00");
        const result = formatDisplayDate(date, {
          month: "numeric",
        });
        expect(result).toMatch(/1/);
      });

      it("should format without time", () => {
        const date = new Date("2024-01-15T10:30:00");
        const result = formatDisplayDate(date, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: undefined,
          minute: undefined,
        });
        expect(result).toContain("Jan");
        expect(result).toContain("15");
        expect(result).toContain("2024");
      });
    });

    describe("Different Date Values", () => {
      it("should format dates at year start", () => {
        const date = new Date("2024-01-01T00:00:00");
        const result = formatDisplayDate(date);
        expect(result).toContain("Jan");
        expect(result).toContain("1");
        expect(result).toContain("2024");
      });

      it("should format dates at year end", () => {
        const date = new Date("2024-12-31T23:59:59");
        const result = formatDisplayDate(date);
        expect(result).toContain("Dec");
        expect(result).toContain("31");
        expect(result).toContain("2024");
      });

      it("should format dates in different months", () => {
        const months = [
          { date: "2024-01-15", month: "Jan" },
          { date: "2024-02-15", month: "Feb" },
          { date: "2024-03-15", month: "Mar" },
          { date: "2024-04-15", month: "Apr" },
          { date: "2024-05-15", month: "May" },
          { date: "2024-06-15", month: "Jun" },
          { date: "2024-07-15", month: "Jul" },
          { date: "2024-08-15", month: "Aug" },
          { date: "2024-09-15", month: "Sep" },
          { date: "2024-10-15", month: "Oct" },
          { date: "2024-11-15", month: "Nov" },
          { date: "2024-12-15", month: "Dec" },
        ];

        months.forEach(({ date, month }) => {
          const result = formatDisplayDate(new Date(date));
          expect(result).toContain(month);
        });
      });
    });

    describe("Time Formatting", () => {
      it("should format midnight correctly", () => {
        const date = new Date("2024-01-15T00:00:00");
        const result = formatDisplayDate(date);
        expect(result).toMatch(/12:00/);
      });

      it("should format noon correctly", () => {
        const date = new Date("2024-01-15T12:00:00");
        const result = formatDisplayDate(date);
        expect(result).toMatch(/12:00/);
      });

      it("should format morning times", () => {
        const date = new Date("2024-01-15T09:30:00");
        const result = formatDisplayDate(date);
        expect(result).toMatch(/9:30/);
      });

      it("should format afternoon times", () => {
        const date = new Date("2024-01-15T15:45:00");
        const result = formatDisplayDate(date);
        expect(result).toMatch(/3:45/);
      });
    });

    describe("Edge Cases", () => {
      it("should handle leap year date", () => {
        const date = new Date("2024-02-29T10:00:00");
        const result = formatDisplayDate(date);
        expect(result).toContain("Feb");
        expect(result).toContain("29");
      });

      it("should handle very old dates", () => {
        const date = new Date("1900-01-01T00:00:00");
        const result = formatDisplayDate(date);
        expect(result).toContain("1900");
      });

      it("should handle future dates", () => {
        const date = new Date("2099-12-31T23:59:59");
        const result = formatDisplayDate(date);
        expect(result).toContain("2099");
      });
    });

    describe("String Input", () => {
      it("should handle various ISO string formats", () => {
        const formats = [
          "2024-01-15T10:30:00Z",
          "2024-01-15T10:30:00.000Z",
          "2024-01-15T10:30:00+00:00",
        ];

        formats.forEach((format) => {
          const result = formatDisplayDate(format);
          expect(result).toContain("Jan");
          expect(result).toContain("15");
          expect(result).toContain("2024");
        });
      });
    });
  });

  describe("getCurrentTimestamp", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return ISO format string", () => {
      const mockDate = new Date("2024-01-15T12:30:45.123Z");
      vi.setSystemTime(mockDate);

      const result = getCurrentTimestamp();
      expect(result).toBe("2024-01-15T12:30:45.123Z");
    });

    it("should return current time", () => {
      const mockDate = new Date("2024-06-20T08:15:30.456Z");
      vi.setSystemTime(mockDate);

      const result = getCurrentTimestamp();
      expect(result).toBe("2024-06-20T08:15:30.456Z");
    });

    it("should return valid ISO string", () => {
      const result = getCurrentTimestamp();

      // Should be parseable as a valid date
      const parsed = new Date(result);
      expect(parsed.toISOString()).toBe(result);
    });

    it("should include timezone information", () => {
      const result = getCurrentTimestamp();
      expect(result).toMatch(/Z$/); // Should end with Z for UTC
    });

    it("should include milliseconds", () => {
      const mockDate = new Date("2024-01-15T12:30:45.123Z");
      vi.setSystemTime(mockDate);

      const result = getCurrentTimestamp();
      expect(result).toContain(".123Z");
    });

    it("should return different timestamps when called at different times", () => {
      const timestamp1 = getCurrentTimestamp();

      vi.advanceTimersByTime(1000); // Advance by 1 second

      const timestamp2 = getCurrentTimestamp();

      expect(timestamp1).not.toBe(timestamp2);
    });

    it("should format midnight correctly", () => {
      vi.setSystemTime(new Date("2024-01-15T00:00:00.000Z"));

      const result = getCurrentTimestamp();
      expect(result).toBe("2024-01-15T00:00:00.000Z");
    });

    it("should format year boundaries correctly", () => {
      vi.setSystemTime(new Date("2024-12-31T23:59:59.999Z"));

      const result = getCurrentTimestamp();
      expect(result).toBe("2024-12-31T23:59:59.999Z");
    });
  });
});
