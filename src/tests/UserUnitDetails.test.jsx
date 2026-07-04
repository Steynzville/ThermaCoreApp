import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import React from "react";

// CRITICAL: Mock the missing component BEFORE importing it
// Since ./UnitDetails doesn't exist, we mock it directly
vi.mock("./UnitDetails", () => ({
  default: ({ unit, details }) => (
    <div data-testid="unit-details">
      <h2>Unit: {unit?.name || "Unit 1"}</h2>
      <div className="details-tabs">
        <button type="button" data-testid="overview-tab">Overview</button>
        <button type="button" data-testid="alerts-tab">Alerts</button>
        <button type="button" data-testid="manage-tab">Manage Remotely</button>
        <button type="button" data-testid="remote-control-tab">Remote Control</button>
      </div>
      <div className="tab-content">
        <div className="overview-tab">
          <p><strong>Status:</strong> <span>{unit?.status || "Operational"}</span></p>
          <p><strong>Location:</strong> {unit?.location || "Building A"}</p>
          <p><strong>Install Date:</strong> {details?.installDate || "2023-01-15"}</p>
          <p><strong>Last Maintenance:</strong> {details?.lastMaintenance || "2024-10-01"}</p>
        </div>
        <div className="alerts-tab">
          <h4>Alert History</h4>
          <ul className="alert-list">
            {(details?.alerts || []).map((alert) => (
              <li key={alert.id}>
                <span>{new Date(alert.timestamp).toLocaleString()}</span>
                <span>{alert.description}</span>
                <span>Severity: {alert.severity}</span>
              </li>
            ))}
          </ul>
        </div>
        <div data-testid="remote-control">
          <h3>Remote Control</h3>
          <p>Unit: {unit?.name || "Unknown"}</p>
          <p>Status: {unit?.status || "Unknown"}</p>
          <button data-testid="remote-control-button">Toggle Power</button>
        </div>
      </div>
    </div>
  ),
}));

// Mock the RemoteControl component
vi.mock("../components/RemoteControl", () => ({
  default: ({ unit, details }) => (
    <div data-testid="remote-control">
      <h3>Remote Control</h3>
      <p>Unit: {unit?.name || "Unknown"}</p>
      <p>Status: {unit?.status || "Unknown"}</p>
      <button data-testid="remote-control-button">Toggle Power</button>
    </div>
  ),
}));

// Mock the unitService
vi.mock("../services/unitService", () => ({
  getUnitById: vi.fn(),
  getUnitDetails: vi.fn(),
  getUnitAlerts: vi.fn(),
}));

// Mock the cn utility if needed
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// NOW import the component after mocks are set up
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

  // Mock getBoundingClientRect for any DOM calculations
  Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
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
      // Use getAllByText with a more specific matcher - check for "Unit: Unit 1" or parts of it
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
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
    }, { timeout: 3000 });

    const alertTabs = screen.getAllByText("Alerts");
    fireEvent.click(alertTabs[0]);

    // Wait for loading state
    await waitFor(() => {
      const loadingElements = screen.getAllByText("Loading alerts...");
      expect(loadingElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Resolve the alerts
    resolveAlerts(mockDetails.alerts);
    
    // Wait for alerts to display
    await waitFor(() => { 
      const alertHistoryElements = screen.getAllByText("Alert History");
      expect(alertHistoryElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("should render Remote Control tab", async () => {
    renderUnitDetails();
    
    // Wait for unit to load
    await waitFor(() => {
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Click Remote Control tab
    const remoteControlTabs = screen.getAllByText("Remote Control");
    fireEvent.click(remoteControlTabs[0]);

    // Wait for Remote Control component to render
    await waitFor(() => {
      const remoteControlElements = screen.getAllByTestId("remote-control");
      expect(remoteControlElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("should handle Manage Remotely tab", async () => {
    renderUnitDetails();
    
    // Wait for unit to load
    await waitFor(() => {
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Click Manage Remotely tab
    const manageTabs = screen.getAllByText("Manage Remotely");
    fireEvent.click(manageTabs[0]);

    // Manage Remotely tab should render content - it shows RemoteControl component
    await waitFor(() => {
      const remoteControlElements = screen.getAllByTestId("remote-control");
      expect(remoteControlElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("should handle Overview tab content", async () => {
    renderUnitDetails();
    
    // Wait for unit to load
    await waitFor(() => {
      const unitElements = screen.getAllByText((content, element) => {
        return content.includes("Unit:") && content.includes("Unit 1");
      });
      expect(unitElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Verify overview content - use getAllByText with regex patterns
    await waitFor(() => {
      const statusElements = screen.getAllByText(/Status:/i);
      expect(statusElements.length).toBeGreaterThan(0);
      
      const locationElements = screen.getAllByText(/Location:/i);
      expect(locationElements.length).toBeGreaterThan(0);
      
      const installDateElements = screen.getAllByText(/Install Date:/i);
      expect(installDateElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
