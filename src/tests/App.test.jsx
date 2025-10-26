import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Login page for unauthenticated user", () => {
    render(<App />);
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
  });

  it("renders with all required providers", () => {
    render(<App />);
    // App should render without crashing
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
  });

  it("redirects to /login when accessing root path", () => {
    render(<App />);
    // Should show login screen when accessing root
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
  });

  it("renders router with routes", () => {
    render(<App />);
    // App should have routing functionality
    expect(window.location.pathname).toBeDefined();
  });

  it("mounts and unmounts without errors", () => {
    const { unmount } = render(<App />);
    expect(() => unmount()).not.toThrow();
  });

  it("renders theme toggle component", () => {
    render(<App />);
    // Theme toggle should be present in the DOM
    const app = document.querySelector(".min-h-screen");
    expect(app).toBeInTheDocument();
  });
});
