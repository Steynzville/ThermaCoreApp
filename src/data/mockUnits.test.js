import { describe, expect, it } from "vitest";
import { units } from "./mockUnits";

describe("mockUnits", () => {
  describe("Unit Count", () => {
    it("should have exactly 20 units", () => {
      expect(units).toHaveLength(20);
    });
  });

  describe("Product Line Distribution", () => {
    it("should have correct product line distribution", () => {
      const powerBox = units.filter((u) => u.productLine === "Power-Box");
      const powerPlus = units.filter((u) => u.productLine === "Power-Plus");
      const titan = units.filter((u) => u.productLine === "Titan");

      expect(powerBox).toHaveLength(8); // 40%
      expect(powerPlus).toHaveLength(7); // 35%
      expect(titan).toHaveLength(5); // 25%
    });

    it("should assign Power-Box to TC001-TC008", () => {
      const powerBoxUnits = units.filter((u) => u.productLine === "Power-Box");
      const expectedIds = [
        "TC001",
        "TC002",
        "TC003",
        "TC004",
        "TC005",
        "TC006",
        "TC007",
        "TC008",
      ];
      const actualIds = powerBoxUnits.map((u) => u.id).sort();
      expect(actualIds).toEqual(expectedIds);
    });

    it("should assign Power-Plus to TC009-TC015", () => {
      const powerPlusUnits = units.filter(
        (u) => u.productLine === "Power-Plus",
      );
      const expectedIds = [
        "TC009",
        "TC010",
        "TC011",
        "TC012",
        "TC013",
        "TC014",
        "TC015",
      ];
      const actualIds = powerPlusUnits.map((u) => u.id).sort();
      expect(actualIds).toEqual(expectedIds);
    });

    it("should assign Titan to TC016-TC020", () => {
      const titanUnits = units.filter((u) => u.productLine === "Titan");
      const expectedIds = ["TC016", "TC017", "TC018", "TC019", "TC020"];
      const actualIds = titanUnits.map((u) => u.id).sort();
      expect(actualIds).toEqual(expectedIds);
    });
  });

  describe("Required Fields", () => {
    it("should have productLine field on all units", () => {
      units.forEach((unit) => {
        expect(unit).toHaveProperty("productLine");
        expect(unit.productLine).toBeTruthy();
      });
    });

    it("should preserve all original fields", () => {
      const requiredFields = [
        "id",
        "watergeneration",
        "temp_outside",
        "humidity",
        "temp_in",
        "temp_out",
        "water_level",
        "battery_level",
        "pressure",
        "name",
        "serialNumber",
        "location",
        "status",
        "hasAlert",
        "hasAlarm",
        "healthStatus",
        "currentPower",
        "parasiticLoad",
        "userLoad",
        "productLine",
      ];

      units.forEach((unit) => {
        requiredFields.forEach((field) => {
          expect(unit).toHaveProperty(field);
        });
      });
    });

    it("should have client object with required fields", () => {
      const clientFields = ["name", "contact", "email", "phone"];

      units.forEach((unit) => {
        if (unit.client) {
          clientFields.forEach((field) => {
            expect(unit.client).toHaveProperty(field);
          });
        }
      });
    });
  });

  describe("Data Integrity", () => {
    it("should have unique unit IDs", () => {
      const ids = units.map((u) => u.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have sequential unit IDs from TC001 to TC020", () => {
      const expectedIds = Array.from(
        { length: 20 },
        (_, i) => `TC${String(i + 1).padStart(3, "0")}`,
      );
      const actualIds = units.map((u) => u.id).sort();
      expect(actualIds).toEqual(expectedIds);
    });

    it("should have valid status values", () => {
      const validStatuses = ["online", "offline", "maintenance"];
      units.forEach((unit) => {
        expect(validStatuses).toContain(unit.status);
      });
    });

    it("should have boolean values for watergeneration, hasAlert, hasAlarm", () => {
      units.forEach((unit) => {
        expect(typeof unit.watergeneration).toBe("boolean");
        expect(typeof unit.hasAlert).toBe("boolean");
        expect(typeof unit.hasAlarm).toBe("boolean");
      });
    });

    it("should have numeric values for sensor readings", () => {
      units.forEach((unit) => {
        expect(typeof unit.temp_outside).toBe("number");
        expect(typeof unit.humidity).toBe("number");
        expect(typeof unit.temp_in).toBe("number");
        expect(typeof unit.temp_out).toBe("number");
        expect(typeof unit.water_level).toBe("number");
        expect(typeof unit.battery_level).toBe("number");
        expect(typeof unit.pressure).toBe("number");
        expect(typeof unit.currentPower).toBe("number");
        expect(typeof unit.parasiticLoad).toBe("number");
        expect(typeof unit.userLoad).toBe("number");
      });
    });
  });

  describe("Product Line Statistics", () => {
    it("should calculate correct percentage distribution", () => {
      const total = units.length;
      const powerBox = units.filter((u) => u.productLine === "Power-Box");
      const powerPlus = units.filter((u) => u.productLine === "Power-Plus");
      const titan = units.filter((u) => u.productLine === "Titan");

      expect(Math.round((powerBox.length / total) * 100)).toBe(40);
      expect(Math.round((powerPlus.length / total) * 100)).toBe(35);
      expect(Math.round((titan.length / total) * 100)).toBe(25);
    });

    it("should have all units assigned to a product line", () => {
      const unitsWithProductLine = units.filter((u) => u.productLine);
      expect(unitsWithProductLine.length).toBe(20);
    });

    it("should only have valid product line values", () => {
      const validProductLines = ["Power-Box", "Power-Plus", "Titan"];
      units.forEach((unit) => {
        expect(validProductLines).toContain(unit.productLine);
      });
    });
  });
});
