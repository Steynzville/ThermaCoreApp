import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import React from "react";
import ProfileSettings from "../../components/settings/ProfileSettings";

describe("ProfileSettings", () => {
  // Render once per suite to reduce overhead
  beforeEach(() => {
    render(React.createElement(ProfileSettings));
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
