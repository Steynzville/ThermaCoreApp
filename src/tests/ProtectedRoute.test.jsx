import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { SidebarProvider } from "../context/SidebarContext";
import { ThemeProvider } from "../context/ThemeContext";

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

describe("ProtectedRoute", () => {
  it("redirects unauthenticated user to login page", () => {
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route
                  path="/protected"
                  element={
                    <ProtectedRoute>
                      <p>Protected Content</p>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    const loginElements = screen.getAllByText(/Login Page/i);
    expect(loginElements.length).toBeGreaterThan(0);
  });
});
