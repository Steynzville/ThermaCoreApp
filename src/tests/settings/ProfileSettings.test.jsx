import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import ProfileSettings from "../../components/settings/ProfileSettings";

describe("ProfileSettings", () => {
  // Use Fake Timers to intercept any background polling or animation loops
  beforeEach(() => {
    vi.useFakeTimers();
    render(React.createElement(ProfileSettings));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers(); // Release control of the clock
  });

  it("renders profile card with title", () => {
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders full name field", () => {
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
  });

  it("renders email field", () => {
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });
});
