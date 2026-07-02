import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, afterEach, vi } from "vitest";
import Spinner from "../components/common/Spinner";

describe("Spinner", () => {
  // Ensure cleanup after every single test
  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it("renders correctly with default srLabel", () => {
    render(<Spinner />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders correctly with custom srLabel", () => {
    render(<Spinner srLabel="Custom Loading Text" />);
    expect(screen.getByText("Custom Loading Text")).toBeInTheDocument();
  });
});
