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

  // Mock window.matchMedia for responsive components
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // Mock ResizeObserver
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

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

// Mock the RemoteControl component
vi.mock("../components/RemoteControl", () => ({
  default: ({ unit, details }) => (
    <div data-testid="remote-control">
      <h3>Remote Control</h3>
      <p>Unit: {unit.name}</p>
      <p>Status: {unit.status}</p>
      <button data-testid="remote-control-button">Toggle Power</button>
    </div>
  ),
}));

// 1. Explicit service mock using spyOn
vi.mock("../services/unitService", () => ({
  getUnitById: vi.fn(),
  getUnitDetails: vi.fn(),
  getUnitAlerts: vi.fn(),
}));

describe("UnitDetails", () => {
  const mockUnit = { 
    id: "1", 
    name: "Unit 1", 
    status: "Operational", 
    location: "Building A" 
  };
  const mockDetails = {
    installDate: "2023-01-15",
    lastMaintenance: "2024-10-01",
    alerts: [
      { 
        id: 1, 
        severity: "Warning", 
        description: "Temperature high", 
        timestamp: "2024-10-23T10:00:00Z" 
      },
      { 
        id: 2, 
        severity: "Critical", 
        description: "Pressure drop detected", 
        timestamp: "2024-10-23T11:00:00Z" 
      },
    ],
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
      // Use getAllByText with a more specific matcher
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    });
  });

  it("should handle alerts tab loading state", async () => {
    let resolveAlerts;
    unitService.getUnitAlerts.mockReturnValue(new Promise((res) => { resolveAlerts = res; }));

    renderUnitDetails();
    await waitFor(() => { 
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    });

    const alertTabs = screen.getAllByText("Alerts");
    fireEvent.click(alertTabs[0]);

    // Wait for loading state
    await waitFor(() => {
      const loadingElements = screen.getAllByText("Loading alerts...");
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    // Resolve the alerts
    resolveAlerts(mockDetails.alerts);
    
    // Wait for alerts to display
    await waitFor(() => { 
      const alertHistoryElements = screen.getAllByText("Alert History");
      expect(alertHistoryElements.length).toBeGreaterThan(0);
    });
  });

  it("should render Remote Control tab", async () => {
    renderUnitDetails();
    
    // Wait for unit to load
    await waitFor(() => {
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    });

    // Click Remote Control tab
    const remoteControlTabs = screen.getAllByText("Remote Control");
    fireEvent.click(remoteControlTabs[0]);

    // Wait for Remote Control component to render
    await waitFor(() => {
      const remoteControlElements = screen.getAllByTestId("remote-control");
      expect(remoteControlElements.length).toBeGreaterThan(0);
    });
  });

  it("should handle Manage Remotely tab", async () => {
    renderUnitDetails();
    
    // Wait for unit to load
    await waitFor(() => {
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    });

    // Click Manage Remotely tab
    const manageTabs = screen.getAllByText("Manage Remotely");
    fireEvent.click(manageTabs[0]);

    // Manage Remotely tab should render content
    await waitFor(() => {
      const remoteControlElements = screen.getAllByTestId("remote-control");
      expect(remoteControlElements.length).toBeGreaterThan(0);
    });
  });

  it("should handle Overview tab content", async () => {
    renderUnitDetails();
    
    // Wait for unit to load
    await waitFor(() => {
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    });

    // Verify overview content
    await waitFor(() => {
      const statusElements = screen.getAllByText(/Status:/);
      expect(statusElements.length).toBeGreaterThan(0);
      
      const locationElements = screen.getAllByText(/Location:/);
      expect(locationElements.length).toBeGreaterThan(0);
      
      const installDateElements = screen.getAllByText(/Install Date:/);
      expect(installDateElements.length).toBeGreaterThan(0);
    });
  });
});
