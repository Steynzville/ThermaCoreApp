import { render, screen } from "@testing-library/react";

describe("Spinner", () => {
  it("renders correctly with default srLabel", () => {
    render(<Spinner />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders correctly with custom srLabel", () => {
    render(<Spinner srLabel="Custom Loading Text" />);
    expect(screen.getByText("Custom Loading Text")).toBeInTheDocument();
  });
});
