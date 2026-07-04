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
    // Wait for the loading to complete and unit details to appear
    await waitFor(() => {
      // Use a more specific matcher - find the heading that contains "Unit: Unit 1"
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Unit: Unit 1');
    });
  });

  it("should handle alerts tab loading state", async () => {
    let resolveAlerts;
    // Mock the alerts to return a promise we can control
    unitService.getUnitAlerts.mockReturnValue(new Promise((res) => { resolveAlerts = res; }));

    renderUnitDetails();
    // Wait for unit data to load
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Unit: Unit 1');
    });

    // Click the Alerts tab
    const alertTab = screen.getByText('Alerts');
    fireEvent.click(alertTab);

    // Wait for loading state to appear - use getByText with regex to be more flexible
    await waitFor(() => {
      const loadingElements = screen.getAllByText(/Loading alerts/i);
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    // Resolve the alerts promise
    if (resolveAlerts) {
      resolveAlerts(mockDetails.alerts);
    }
    
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
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Unit: Unit 1');
    });

    // Click Remote Control tab
    const remoteControlTab = screen.getByText('Remote Control');
    fireEvent.click(remoteControlTab);

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
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Unit: Unit 1');
    });

    // Click Manage Remotely tab
    const manageTab = screen.getByText('Manage Remotely');
    fireEvent.click(manageTab);

    // Manage Remotely tab should render content - it shows RemoteControl component
    await waitFor(() => {
      const remoteControlElements = screen.getAllByTestId("remote-control");
      expect(remoteControlElements.length).toBeGreaterThan(0);
    });
  });

  it("should handle Overview tab content", async () => {
    renderUnitDetails();
    
    // Wait for unit to load
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Unit: Unit 1');
    });

    // Verify overview content - use getByText with specific text
    const statusElement = screen.getByText(/Status:/i);
    expect(statusElement).toBeInTheDocument();
    
    const locationElement = screen.getByText(/Location:/i);
    expect(locationElement).toBeInTheDocument();
    
    const installDateElement = screen.getByText(/Install Date:/i);
    expect(installDateElement).toBeInTheDocument();
  });
});
