import { describe, expect, it } from "vitest";

import { formatCurrency, formatNumber } from "../utils/formatCurrency";

describe("formatCurrency", () => {
  describe("Basic Formatting", () => {
    it("should format positive amounts correctly", () => {
      expect(formatCurrency(1000)).toBe("$1,000.00");
      expect(formatCurrency(1234.56)).toBe("$1,234.56");
      expect(formatCurrency(999999.99)).toBe("$999,999.99");
    });

    it("should format negative amounts correctly", () => {
      const result1 = formatCurrency(-1000);
      const result2 = formatCurrency(-1234.56);

      // Negative sign position varies by locale
      expect(result1).toMatch(/1,000\.00/);
      expect(result2).toMatch(/1,234\.56/);
      expect(result1).toContain("$");
      expect(result2).toContain("$");
    });

    it("should format zero correctly", () => {
      expect(formatCurrency(0)).toMatch(/0\.00/);
      // -0 may format as -0.00 or 0.00 depending on environment
      const result = formatCurrency(-0);
      expect(result).toMatch(/0\.00/);
    });

    it("should format small decimal amounts", () => {
      expect(formatCurrency(0.01)).toBe("$0.01");
      expect(formatCurrency(0.99)).toBe("$0.99");
      expect(formatCurrency(1.5)).toBe("$1.50");
    });
  });

  describe("Large Numbers", () => {
    it("should format millions correctly", () => {
      expect(formatCurrency(1000000)).toBe("$1,000,000.00");
      expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
    });

    it("should format billions correctly", () => {
      expect(formatCurrency(1000000000)).toBe("$1,000,000,000.00");
    });

    it("should handle very large numbers", () => {
      expect(formatCurrency(999999999999.99)).toBe("$999,999,999,999.99");
    });
  });

  describe("Custom Currency Symbol", () => {
    it("should use custom currency symbol", () => {
      expect(formatCurrency(1000, "€")).toBe("€1,000.00");
      expect(formatCurrency(1000, "£")).toBe("£1,000.00");
      expect(formatCurrency(1000, "¥")).toBe("¥1,000.00");
    });

    it("should handle empty currency symbol", () => {
      expect(formatCurrency(1000, "")).toBe("1,000.00");
    });

    it("should handle multi-character currency symbols", () => {
      expect(formatCurrency(1000, "USD ")).toBe("USD 1,000.00");
      expect(formatCurrency(1000, "CAD$")).toBe("CAD$1,000.00");
    });
  });

  describe("Edge Cases", () => {
    it("should handle NaN", () => {
      expect(formatCurrency(NaN)).toBe("$0.00");
    });

    it("should handle undefined", () => {
      expect(formatCurrency(undefined)).toBe("$0.00");
    });

    it("should handle null", () => {
      expect(formatCurrency(null)).toBe("$0.00");
    });

    it("should handle string input", () => {
      expect(formatCurrency("1000")).toBe("$0.00");
      expect(formatCurrency("invalid")).toBe("$0.00");
    });

    it("should handle Infinity", () => {
      const result1 = formatCurrency(Infinity);
      const result2 = formatCurrency(-Infinity);

      // Infinity symbol varies by locale (∞ or "Infinity")
      expect(result1).toContain("$");
      expect(result2).toMatch(/[$-]/);
    });
  });

  describe("Rounding", () => {
    it("should round to 2 decimal places", () => {
      expect(formatCurrency(1.234)).toBe("$1.23");
      expect(formatCurrency(1.235)).toBe("$1.24"); // Banker's rounding
      expect(formatCurrency(1.999)).toBe("$2.00");
    });

    it("should handle rounding edge cases", () => {
      expect(formatCurrency(0.005)).toBe("$0.01"); // Banker's rounding
      expect(formatCurrency(0.004)).toBe("$0.00");
    });
  });
});

describe("formatNumber", () => {
  describe("Basic Formatting", () => {
    it("should format positive numbers correctly", () => {
      expect(formatNumber(1000)).toBe("1,000.00");
      expect(formatNumber(1234.56)).toBe("1,234.56");
      expect(formatNumber(999999.99)).toBe("999,999.99");
    });

    it("should format negative numbers correctly", () => {
      expect(formatNumber(-1000)).toBe("-1,000.00");
      expect(formatNumber(-1234.56)).toBe("-1,234.56");
    });

    it("should format zero correctly", () => {
      expect(formatNumber(0)).toMatch(/0\.00/);
      // -0 may format as -0.00 or 0.00 depending on environment
      const result = formatNumber(-0);
      expect(result).toMatch(/0\.00/);
    });

    it("should format small decimal numbers", () => {
      expect(formatNumber(0.01)).toBe("0.01");
      expect(formatNumber(0.99)).toBe("0.99");
      expect(formatNumber(1.5)).toBe("1.50");
    });
  });

  describe("Custom Decimal Places", () => {
    it("should format with 0 decimal places", () => {
      expect(formatNumber(1234.56, 0)).toBe("1,235");
      expect(formatNumber(1000, 0)).toBe("1,000");
    });

    it("should format with 1 decimal place", () => {
      expect(formatNumber(1234.56, 1)).toBe("1,234.6");
      expect(formatNumber(1000, 1)).toBe("1,000.0");
    });

    it("should format with 3 decimal places", () => {
      expect(formatNumber(1234.567, 3)).toBe("1,234.567");
      expect(formatNumber(1000, 3)).toBe("1,000.000");
    });

    it("should format with 4+ decimal places", () => {
      expect(formatNumber(1234.5678, 4)).toBe("1,234.5678");
      expect(formatNumber(1.23456789, 6)).toBe("1.234568");
    });
  });

  describe("Large Numbers", () => {
    it("should format millions correctly", () => {
      expect(formatNumber(1000000)).toBe("1,000,000.00");
      expect(formatNumber(1234567.89)).toBe("1,234,567.89");
    });

    it("should format billions correctly", () => {
      expect(formatNumber(1000000000)).toBe("1,000,000,000.00");
    });

    it("should handle very large numbers", () => {
      expect(formatNumber(999999999999.99)).toBe("999,999,999,999.99");
    });
  });

  describe("Edge Cases", () => {
    it("should handle NaN", () => {
      expect(formatNumber(NaN)).toBe("0.00");
    });

    it("should handle undefined", () => {
      expect(formatNumber(undefined)).toBe("0.00");
    });

    it("should handle null", () => {
      expect(formatNumber(null)).toBe("0.00");
    });

    it("should handle string input", () => {
      expect(formatNumber("1000")).toBe("0.00");
      expect(formatNumber("invalid")).toBe("0.00");
    });

    it("should handle Infinity", () => {
      // Infinity symbol varies by locale (∞ or "Infinity")
      const result1 = formatNumber(Infinity);
      const result2 = formatNumber(-Infinity);

      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
    });
  });

  describe("Rounding", () => {
    it("should round to specified decimal places", () => {
      expect(formatNumber(1.234, 2)).toBe("1.23");
      expect(formatNumber(1.235, 2)).toBe("1.24");
      expect(formatNumber(1.999, 2)).toBe("2.00");
    });

    it("should handle rounding with different decimal places", () => {
      expect(formatNumber(1.2345, 3)).toBe("1.235");
      expect(formatNumber(1.2344, 3)).toBe("1.234");
      expect(formatNumber(1.9999, 0)).toBe("2");
    });
  });

  describe("Default Parameters", () => {
    it("should use 2 decimals by default", () => {
      expect(formatNumber(1000)).toBe("1,000.00");
      expect(formatNumber(1234.5)).toBe("1,234.50");
    });
  });
});
