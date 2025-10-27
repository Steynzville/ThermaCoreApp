import { describe, expect, it } from "vitest";
import * as servicesIndex from "../services/index";

describe("Services Index", () => {
  it("exports authService functions", () => {
    expect(servicesIndex.login).toBeDefined();
    expect(servicesIndex.logout).toBeDefined();
    expect(servicesIndex.isAuthenticated).toBeDefined();
  });

  it("exports scadaService", () => {
    expect(servicesIndex.scadaService).toBeDefined();
    expect(typeof servicesIndex.scadaService).toBe("object");
  });

  it("exports unitService functions", () => {
    expect(servicesIndex.getAllUnits).toBeDefined();
    expect(servicesIndex.getUnitDetails).toBeDefined();
  });

  it("exports usersAPI functions", () => {
    expect(servicesIndex.getAllUsers).toBeDefined();
    expect(servicesIndex.deleteUser).toBeDefined();
  });

  it("exports websocketService", () => {
    expect(servicesIndex.websocketService).toBeDefined();
    expect(typeof servicesIndex.websocketService).toBe("object");
  });
});
