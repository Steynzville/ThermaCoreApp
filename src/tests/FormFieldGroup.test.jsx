import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormFieldGroup from "../components/common/FormFieldGroup";

// Mock EyeIcon and EyeIconClosed components
vi.mock("../components/EyeIcon", () => ({
  default: () => <svg data-testid="eye-icon" />,
}));

vi.mock("../components/EyeIconClosed", () => ({
  default: () => <svg data-testid="eye-closed-icon" />,
}));

describe("FormFieldGroup", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders input with label", () => {
      render(
        <FormFieldGroup
          id="username"
          label="Username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
      expect(screen.getByLabelText("Username")).toHaveAttribute("id", "username");
      expect(screen.getByLabelText("Username")).toHaveAttribute("name", "username");
    });

    it("renders input without label", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("renders with placeholder", () => {
      render(
        <FormFieldGroup
          id="username"
          placeholder="Enter username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByPlaceholderText("Enter username");
      expect(input).toBeInTheDocument();
    });

    it("renders with initial value", () => {
      render(
        <FormFieldGroup
          id="username"
          value="testuser"
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByDisplayValue("testuser");
      expect(input).toBeInTheDocument();
    });
  });

  describe("input types", () => {
    it("renders text input by default", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "text");
    });

    it("renders password input with password toggle", () => {
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value=""
          onChange={mockOnChange}
        />
      );
      
      // Find input by id or role
      const input = document.querySelector('input[id="password"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "password");
      
      // Password toggle button should be present
      const toggleButton = screen.getByRole("button", { name: /show password/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("renders email input", () => {
      render(
        <FormFieldGroup
          id="email"
          type="email"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    it("renders number input", () => {
      render(
        <FormFieldGroup
          id="age"
          type="number"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("type", "number");
    });
  });

  describe("password toggle", () => {
    it("toggles password visibility when button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value="secret"
          onChange={mockOnChange}
        />
      );
      
      const input = document.querySelector('input[id="password"]');
      expect(input).toHaveAttribute("type", "password");
      
      const toggleButton = screen.getByRole("button", { name: /show password/i });
      await user.click(toggleButton);
      
      expect(input).toHaveAttribute("type", "text");
      
      // Button label should change
      expect(toggleButton).toHaveAttribute("aria-label", "Hide password");
    });

    it("shows EyeIcon when password is hidden", () => {
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value="secret"
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByTestId("eye-closed-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("eye-icon")).not.toBeInTheDocument();
    });

    it("shows EyeIconClosed when password is shown", async () => {
      const user = userEvent.setup();
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value="secret"
          onChange={mockOnChange}
        />
      );
      
      const toggleButton = screen.getByRole("button", { name: /show password/i });
      await user.click(toggleButton);
      
      expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("eye-closed-icon")).not.toBeInTheDocument();
    });

    it("does not show password toggle when showPasswordToggle is false", () => {
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value="secret"
          onChange={mockOnChange}
          showPasswordToggle={false}
        />
      );
      
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("does not show password toggle for non-password fields", () => {
      render(
        <FormFieldGroup
          id="username"
          type="text"
          value=""
          onChange={mockOnChange}
        />
      );
      
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("input interaction", () => {
    it("calls onChange when input value changes", async () => {
      const user = userEvent.setup();
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      await user.type(input, "test");
      
      expect(mockOnChange).toHaveBeenCalledTimes(4);
    });

    it("displays the current value", () => {
      render(
        <FormFieldGroup
          id="username"
          value="current value"
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByDisplayValue("current value");
      expect(input).toBeInTheDocument();
    });
  });

  describe("required field", () => {
    it("marks input as required when required prop is true", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          required={true}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("required");
    });

    it("does not mark input as required when required prop is false", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          required={false}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).not.toHaveAttribute("required");
    });

    it("does not mark input as required by default", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).not.toHaveAttribute("required");
    });
  });

  describe("error state", () => {
    it("displays error message", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          error="Username is required"
        />
      );
      
      expect(screen.getByText("Username is required")).toBeInTheDocument();
    });

    it("applies error styles to input", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          error="Invalid input"
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-red-500");
      expect(input).toHaveClass("focus:border-red-500");
      expect(input).toHaveClass("focus:ring-red-500");
    });

    it("applies error styling to error message container", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          error="Error message"
          errorClassName="custom-error"
        />
      );
      
      const errorElement = screen.getByText("Error message");
      expect(errorElement).toHaveClass("custom-error");
    });

    it("does not show error when error prop is empty", () => {
      render(
        <FormFieldGroup
          id="username"
          label="Username"
          value=""
          onChange={mockOnChange}
          error=""
        />
      );
      
      // There should be no error message div with error styling
      const errorElements = document.querySelectorAll('.text-red-600');
      expect(errorElements).toHaveLength(0);
    });

    it("does not show error when error prop is undefined", () => {
      render(
        <FormFieldGroup
          id="username"
          label="Username"
          value=""
          onChange={mockOnChange}
          error={undefined}
        />
      );
      
      const errorElements = document.querySelectorAll('.text-red-600');
      expect(errorElements).toHaveLength(0);
    });
  });

  describe("styling", () => {
    it("applies custom className to container", () => {
      const { container } = render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          className="custom-container"
        />
      );
      
      const formGroup = container.firstChild;
      expect(formGroup).toHaveClass("custom-container");
    });

    it("applies custom inputClassName to input", () => {
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          inputClassName="custom-input"
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("custom-input");
    });

    it("applies custom labelClassName to label", () => {
      render(
        <FormFieldGroup
          id="username"
          label="Username"
          value=""
          onChange={mockOnChange}
          labelClassName="custom-label"
        />
      );
      
      const label = screen.getByText("Username");
      expect(label).toHaveClass("custom-label");
    });
  });

  describe("accessibility", () => {
    it("associates label with input via htmlFor", () => {
      render(
        <FormFieldGroup
          id="username"
          label="Username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const label = screen.getByText("Username");
      expect(label).toHaveAttribute("for", "username");
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "username");
    });

    it("has correct aria-label for password toggle", () => {
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const toggleButton = screen.getByRole("button");
      expect(toggleButton).toHaveAttribute("aria-label", "Show password");
    });

    it("updates aria-label when password is shown", async () => {
      const user = userEvent.setup();
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const toggleButton = screen.getByRole("button");
      await user.click(toggleButton);
      
      expect(toggleButton).toHaveAttribute("aria-label", "Hide password");
    });
  });

  describe("default styles", () => {
    it("applies default styles for login context", () => {
      render(
        <FormFieldGroup
          id="username"
          label="Username"
          value=""
          onChange={mockOnChange}
          className="formGroup"
          inputClassName="loginScreen"
        />
      );
      
      const container = document.querySelector('.formGroup');
      expect(container).toBeInTheDocument();
      
      const input = screen.getByRole("textbox");
      // Should not have default input classes
      expect(input).not.toHaveClass("w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg");
    });

    it("applies default styles for settings/modern context", () => {
      render(
        <FormFieldGroup
          id="username"
          label="Username"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("w-full");
      expect(input).toHaveClass("px-3");
      expect(input).toHaveClass("py-2");
      expect(input).toHaveClass("border");
      expect(input).toHaveClass("rounded-lg");
    });

    it("applies password wrapper styles for password fields", () => {
      render(
        <FormFieldGroup
          id="password"
          type="password"
          value=""
          onChange={mockOnChange}
        />
      );
      
      const wrapper = document.querySelector('.relative');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles undefined value gracefully", () => {
      render(
        <FormFieldGroup
          id="username"
          value={undefined}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });

    it("handles null value gracefully", () => {
      render(
        <FormFieldGroup
          id="username"
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });

    it("handles empty label gracefully", () => {
      render(
        <FormFieldGroup
          id="username"
          label=""
          value=""
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("handles long error messages", () => {
      const longError = "This is a very long error message that might wrap to multiple lines";
      render(
        <FormFieldGroup
          id="username"
          value=""
          onChange={mockOnChange}
          error={longError}
        />
      );
      
      expect(screen.getByText(longError)).toBeInTheDocument();
    });
  });
});
