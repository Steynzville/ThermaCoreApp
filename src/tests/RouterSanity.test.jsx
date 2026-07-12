// src/tests/RouterSanity.test.jsx
// Minimal isolation test — no mocks, no AuthProvider, nothing but the router.
// If this fails the same way App.test.jsx does, the bug is in react-router-dom
// itself under this environment (React 19 + RRv7 + jsdom + vitest), not in
// anything App-specific (mocks, providers, window.location patching, etc).
// If this PASSES, the bug is specific to something in App.test.jsx's setup.

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

describe("Router sanity check", () => {
  // CRITICAL: Ensure real timers before each test
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders a matched route on initial mount", async () => {
    window.history.pushState({}, "", "/");

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div data-testid="root-ok">ROOT OK</div>} />
        </Routes>
      </BrowserRouter>
    );

    const el = await screen.findByTestId("root-ok");
    expect(el).toBeInTheDocument();
  });

  it("follows a Navigate redirect on initial mount", async () => {
    window.history.pushState({}, "", "/");

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/target" replace />} />
          <Route path="/target" element={<div data-testid="target-ok">TARGET OK</div>} />
        </Routes>
      </BrowserRouter>
    );

    const el = await screen.findByTestId("target-ok");
    expect(el).toBeInTheDocument();
  });
});
