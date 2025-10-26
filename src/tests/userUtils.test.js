import { describe, expect, it } from "vitest";

import { capitalize, formatRoleName, formatUserName } from "../utils/userUtils";

describe("userUtils", () => {
  describe("capitalize", () => {
    it("should capitalize the first letter of a string", () => {
      expect(capitalize("admin")).toBe("Admin");
      expect(capitalize("operator")).toBe("Operator");
      expect(capitalize("viewer")).toBe("Viewer");
    });

    it("should handle empty strings", () => {
      expect(capitalize("")).toBe("");
    });

    it("should handle null or undefined", () => {
      expect(capitalize(null)).toBe("");
      expect(capitalize(undefined)).toBe("");
    });

    it("should handle already capitalized strings", () => {
      expect(capitalize("Admin")).toBe("Admin");
    });

    it("should handle single character strings", () => {
      expect(capitalize("a")).toBe("A");
    });
  });

  describe("formatUserName", () => {
    it("should format full name when first and last name are provided", () => {
      const user = {
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
      };
      expect(formatUserName(user)).toBe("John Doe");
    });

    it("should return username when first or last name is missing", () => {
      const user1 = {
        first_name: "John",
        username: "johndoe",
      };
      expect(formatUserName(user1)).toBe("johndoe");

      const user2 = {
        last_name: "Doe",
        username: "johndoe",
      };
      expect(formatUserName(user2)).toBe("johndoe");
    });

    it("should return username when both names are empty strings", () => {
      const user = {
        first_name: "",
        last_name: "",
        username: "johndoe",
      };
      expect(formatUserName(user)).toBe("johndoe");
    });

    it("should trim whitespace from full name", () => {
      const user = {
        first_name: "  John  ",
        last_name: "  Doe  ",
        username: "johndoe",
      };
      expect(formatUserName(user)).toBe("John     Doe");
    });

    it("should handle only username provided", () => {
      const user = {
        username: "johndoe",
      };
      expect(formatUserName(user)).toBe("johndoe");
    });
  });

  describe("formatRoleName", () => {
    it("should capitalize role name from role object", () => {
      const role = { name: "admin" };
      expect(formatRoleName(role)).toBe("Admin");
    });

    it("should capitalize role name from string", () => {
      expect(formatRoleName("operator")).toBe("Operator");
      expect(formatRoleName("viewer")).toBe("Viewer");
    });

    it("should return default role when role is null or undefined", () => {
      expect(formatRoleName(null)).toBe("Viewer");
      expect(formatRoleName(undefined)).toBe("Viewer");
    });

    it("should return custom default role when provided", () => {
      expect(formatRoleName(null, "Guest")).toBe("Guest");
      expect(formatRoleName(undefined, "Unknown")).toBe("Unknown");
    });

    it("should handle role object with no name property", () => {
      const role = { id: 1 };
      expect(formatRoleName(role)).toBe("Viewer");
    });

    it("should handle empty string role", () => {
      expect(formatRoleName("")).toBe("Viewer");
    });

    it("should handle role object with empty name", () => {
      const role = { name: "" };
      expect(formatRoleName(role)).toBe("Viewer");
    });

    it("should preserve already capitalized role names", () => {
      expect(formatRoleName("Admin")).toBe("Admin");
      const role = { name: "Operator" };
      expect(formatRoleName(role)).toBe("Operator");
    });
  });
});
