import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfileSettings from "../../components/settings/ProfileSettings";

describe("ProfileSettings", () => {
  it("renders profile card with title", () => {
    render(<ProfileSettings />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders full name field", () => {
    render(<ProfileSettings />);
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
  });

  it("renders email field", () => {
    render(<ProfileSettings />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });
});
