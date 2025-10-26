import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormField from "./FormField";

// Mock the icon components
vi.mock("./EyeIcon", () => ({
  default: () => <div data-testid="eye-icon">Eye</div>,
}));

vi.mock("./EyeIconClosed", () => ({
  default: () => <div data-testid="eye-icon-closed">EyeClosed</div>,
}));

describe("FormField", () => {
  it("should render text input field", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="test-field"
        label="Test Field"
        type="text"
        value=""
        onChange={onChange}
        placeholder="Enter text"
      />,
    );

    expect(screen.getByLabelText("Test Field")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("should render password field with toggle button", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="password"
        label="Password"
        type="password"
        value=""
        onChange={onChange}
        placeholder="Enter password"
      />,
    );

    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should toggle password visibility when button clicked", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="password"
        label="Password"
        type="password"
        value="secret"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Password");
    const toggleButton = screen.getByRole("button");

    // Initially password type
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByTestId("eye-icon-closed")).toBeInTheDocument();

    // Click to show password
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByTestId("eye-icon")).toBeInTheDocument();

    // Click to hide password
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByTestId("eye-icon-closed")).toBeInTheDocument();
  });

  it("should call onChange when input value changes", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="email"
        label="Email"
        type="email"
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    expect(onChange).toHaveBeenCalled();
  });

  it("should render with required attribute when required prop is true", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="required-field"
        label="Required Field"
        type="text"
        value=""
        onChange={onChange}
        required={true}
      />,
    );

    const input = screen.getByLabelText("Required Field");
    expect(input).toBeRequired();
  });

  it("should not render toggle button for non-password fields", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="text-field"
        label="Text Field"
        type="text"
        value=""
        onChange={onChange}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should render with correct name attribute", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="username"
        label="Username"
        type="text"
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("name", "username");
    expect(input).toHaveAttribute("id", "username");
  });

  it("should render with current value", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="field"
        label="Field"
        type="text"
        value="current value"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Field");
    expect(input).toHaveValue("current value");
  });

  it("should handle different input types", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FormField
        id="field"
        label="Field"
        type="email"
        value=""
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText("Field")).toHaveAttribute("type", "email");

    rerender(
      <FormField
        id="field"
        label="Field"
        type="number"
        value=""
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText("Field")).toHaveAttribute("type", "number");
  });

  it("should default required to false", () => {
    const onChange = vi.fn();
    render(
      <FormField
        id="field"
        label="Field"
        type="text"
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Field");
    expect(input).not.toBeRequired();
  });
});
