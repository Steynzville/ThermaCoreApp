import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EyeIcon from "./EyeIcon";
import EyeIconClosed from "./EyeIconClosed";

describe("EyeIcon", () => {
  it("should render the eye icon", () => {
    render(<EyeIcon />);
    const icon = screen.getByRole("img", { name: /show password/i });
    expect(icon).toBeInTheDocument();
  });

  it("should render with custom className", () => {
    const { container } = render(<EyeIcon className="custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("custom-class");
  });

  it("should have correct default dimensions", () => {
    const { container } = render(<EyeIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("should pass through additional props", () => {
    const { container } = render(<EyeIcon data-testid="eye-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-testid", "eye-icon");
  });

  it("should have accessible title", () => {
    const { container } = render(<EyeIcon />);
    const title = container.querySelector("title");
    expect(title).toHaveTextContent("Show password");
  });
});

describe("EyeIconClosed", () => {
  it("should render the closed eye icon", () => {
    render(<EyeIconClosed />);
    const icon = screen.getByRole("img", { name: /hide password/i });
    expect(icon).toBeInTheDocument();
  });

  it("should render with custom className", () => {
    const { container } = render(<EyeIconClosed className="custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("custom-class");
  });

  it("should have correct default dimensions", () => {
    const { container } = render(<EyeIconClosed />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("should pass through additional props", () => {
    const { container } = render(
      <EyeIconClosed data-testid="eye-icon-closed" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-testid", "eye-icon-closed");
  });

  it("should have accessible title", () => {
    const { container } = render(<EyeIconClosed />);
    const title = container.querySelector("title");
    expect(title).toHaveTextContent("Hide password");
  });
});
