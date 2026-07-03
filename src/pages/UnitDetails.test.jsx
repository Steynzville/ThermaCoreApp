import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import React from "react";
import UnitDetails from "./UnitDetails";
import * as unitService from "../services/unitService";

// Mock AudioContext globally (same as audioPlayer.test.js)
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  decodeAudioData() {
    return Promise.resolve({
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100),
    });
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }
  createGain() {
    return {
      gain: { value: 0.5, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

// Setup AudioContext mock before all tests
beforeAll(() => {
  // Store original if it exists
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = window.webkitAudioContext;

  // Mock AudioContext
  Object.defineProperty(window, "AudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });

  Object.defineProperty(window, "webkitAudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });

  // Clean up after all tests
  return () => {
    Object.defineProperty(window, "AudioContext", {
      writable: true,
      configurable: true,
      value: originalAudioContext,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      writable: true,
      configurable: true,
      value: originalWebkitAudioContext,
    });
  };
});

// 1. Explicit service mock using spyOn
vi.mock("../services/unitService", () => ({
  getUnitById: vi.fn(),
  getUnitDetails: vi.fn(),
  getUnitAlerts: vi.fn(),
}));

describe("UnitDetails", () => {
  const mockUnit = { id: "1", name: "Unit 1", status: "Operational", location: "Building A" };
  const mockDetails = {
    installDate: "2023-01-15",
    lastMaintenance: "2024-10-01",
    alerts: [{ id: 1, severity: "Warning", description: "Temperature high", timestamp: "2024-10-23T10:00:00Z" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    unitService.getUnitById.mockResolvedValue(mockUnit);
    unitService.getUnitDetails.mockResolvedValue(mockDetails);
    unitService.getUnitAlerts.mockResolvedValue(mockDetails.alerts);
  });

  // Use explicit React.createElement for stable component mounting
  const renderUnitDetails = (id = "1", initialEntries = [`/units/${id}`]) => {
    return render(
      React.createElement(MemoryRouter, { initialEntries },
        React.createElement(Routes, null,
          React.createElement(Route, { path: "/units/:id", element: React.createElement(UnitDetails) })
        )
      )
    );
  };

  it("should render loading state initially", () => {
    renderUnitDetails();
    const loadingElements = screen.getAllByText("Loading unit details...");
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it("should render unit details after loading", async () => {
    renderUnitDetails();
    await waitFor(() => {
      const unitElements = screen.getAllByText("Unit: Unit 1");
      expect(unitElements.length).toBeGreaterThan(0);
    });
  });

  it("should handle alerts tab loading state", async () => {
    let resolveAlerts;
    unitService.getUnitAlerts.mockReturnValue(new Promise((res) => { resolveAlerts = res; }));

    renderUnitDetails();
    await waitFor(() => { 
      const unitElements = screen.getAllByText("Unit: Unit 1");
      expect(unitElements.length).toBeGreaterThan(0);
    });

    const alertTabs = screen.getAllByText("Alerts");
    fireEvent.click(alertTabs[0]);

    const loadingElements = screen.getAllByText("Loading alerts...");
    expect(loadingElements.length).toBeGreaterThan(0);

    resolveAlerts(mockDetails.alerts);
    await waitFor(() => { 
      const alertHistoryElements = screen.getAllByText("Alert History");
      expect(alertHistoryElements.length).toBeGreaterThan(0);
    });
  });
});
