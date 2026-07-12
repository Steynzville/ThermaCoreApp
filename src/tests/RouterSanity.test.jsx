// src/tests/RouterSanity.test.jsx
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";

describe("Router sanity check", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders a matched route on initial mount", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<div data-testid="root-ok">ROOT OK</div>} />
        </Routes>
      </MemoryRouter>
    );

    const el = await screen.findByTestId("root-ok");
    expect(el).toBeInTheDocument();
  });

  it("follows a Navigate redirect on initial mount", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Navigate to="/target" replace />} />
          <Route path="/target" element={<div data-testid="target-ok">TARGET OK</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for navigation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const el = await screen.findByTestId("target-ok");
    expect(el).toBeInTheDocument();
  });
});
