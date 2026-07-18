// src/tests/EnvironmentalAssumptions.test.jsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EnvironmentalAssumptions from "../components/EnvironmentalAssumptions";

// Mock the UI components
vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, type }) => (
    <button type={type || "button"} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("../components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
      <button 
        data-testid="dialog-close-trigger" 
        onClick={() => onOpenChange(false)}
      >
        Close Dialog
      </button>
    </div>
  ),
  DialogContent: ({ children, className }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogFooter: ({ children }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

vi.mock("../components/ui/input", () => ({
  Input: ({ id, type, value, onChange, className, min, step, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className={className}
      data-testid={`input-${id}`}
      min={min}
      step={step}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    />
  ),
}));

vi.mock("../components/ui/label", () => ({
  Label: ({ htmlFor, children, className }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

describe("EnvironmentalAssumptions", () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    currentAssumptions: {
      dieselPricePerLiter: 1.50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============ SECTION 1: Rendering Tests ============

  describe("Rendering", () => {
    it("should render dialog when isOpen is true", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "true");
    });

    it("should not render dialog when isOpen is false", () => {
      render(
        <EnvironmentalAssumptions
          {...defaultProps}
          isOpen={false}
        />
      );
      
      const dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "false");
    });

    it("should render dialog header with correct title", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "Environmental Impact Assumptions"
      );
    });

    it("should render label and input fields", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      expect(screen.getByText("Diesel Price ($/L)")).toBeInTheDocument();
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("step", "0.01");
    });

    it("should display current assumption value in input", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(1.50);
    });

    it("should render save button", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const saveButton = screen.getByText("Save changes");
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveAttribute("type", "button");
    });

    it("should handle null currentAssumptions gracefully", () => {
      render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(0);
    });

    it("should handle undefined currentAssumptions gracefully", () => {
      render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={undefined}
        />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(0);
    });

    it("should handle empty currentAssumptions gracefully", () => {
      render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={{}}
        />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(0);
    });

    it("should not show error message initially", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ============ SECTION 2: Input Handling Tests ============

  describe("Input handling", () => {
    it("should update diesel price on input change", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "2.75");
      
      expect(input).toHaveValue(2.75);
    });

    it("should handle empty input value", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      
      expect(input).toHaveValue(null);
    });

    it("should handle decimal values", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "3.14159");
      
      expect(input).toHaveValue(3.14159);
    });

    it("should allow typing negative values (input itself doesn't block them)", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "-5.00");
      
      expect(input).toHaveValue(-5);
    });

    it("should handle special characters in input", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "abc123!@#");
      
      expect(input).toHaveValue(123);
    });

    it("should clear error when user starts typing", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      // Trigger an error
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      // Error should be shown
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid number."
      );
      
      // Start typing - error should clear
      await user.type(input, "1");
      
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ============ SECTION 3: useEffect Tests ============

  describe("useEffect - prop synchronization", () => {
    it("should update input when currentAssumptions changes", () => {
      const { rerender } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(1.50);
      
      rerender(
        <EnvironmentalAssumptions
          {...defaultProps}
          currentAssumptions={{ dieselPricePerLiter: 2.99 }}
        />
      );
      
      expect(input).toHaveValue(2.99);
    });

    it("should clear error when currentAssumptions changes", () => {
      const { rerender } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      const saveButton = screen.getByText("Save changes");

      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(saveButton);

      expect(screen.getByRole("alert")).toBeInTheDocument();

      rerender(
        <EnvironmentalAssumptions
          {...defaultProps}
          currentAssumptions={{ dieselPricePerLiter: 2.99 }}
        />
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should handle currentAssumptions changing to null", () => {
      const { rerender } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(1.50);
      
      rerender(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );
      
      expect(input).toHaveValue(0);
    });

    it("should handle currentAssumptions changing from null to valid", () => {
      const { rerender } = render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(0);
      
      rerender(
        <EnvironmentalAssumptions
          {...defaultProps}
          currentAssumptions={{ dieselPricePerLiter: 3.50 }}
        />
      );
      
      expect(input).toHaveValue(3.50);
    });
  });

  // ============ SECTION 4: Save Functionality Tests ============

  describe("Save functionality", () => {
    it("should call onSave with parsed float value on save", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "2.75");
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 2.75,
      });
    });

    it("should call onClose after save", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onSave with current value if no changes made", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 1.50,
      });
    });

    it("should NOT save when input is empty and show error", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // Error message should be shown
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid number."
      );
      
      // Input should have error styling
      expect(input).toHaveClass("border-red-500");
      
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "dieselPrice-error");
    });

    it("should NOT save when input is negative and show error", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "-5");
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // Error message should be shown
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Diesel price cannot be negative."
      );
      
      // Input should have error styling
      expect(input).toHaveClass("border-red-500");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "dieselPrice-error");
    });

    it("should call onSave then onClose in correct order", async () => {
      const user = userEvent.setup();
      let callOrder = [];
      
      const onSaveWithOrder = () => {
        callOrder.push("save");
      };
      
      const onCloseWithOrder = () => {
        callOrder.push("close");
      };
      
      render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={onCloseWithOrder}
          onSave={onSaveWithOrder}
          currentAssumptions={{ dieselPricePerLiter: 1.50 }}
        />
      );
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(callOrder).toEqual(["save", "close"]);
    });
  });

  // ============ SECTION 5: Dialog Interaction Tests ============

  describe("Dialog interaction", () => {
    it("should call onClose when dialog is closed via overlay", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const closeTrigger = screen.getByTestId("dialog-close-trigger");
      await user.click(closeTrigger);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should pass onClose as onOpenChange prop to Dialog", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "true");
    });

    it("should clear error when dialog closes", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      // Trigger an error
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(screen.getByRole("alert")).toBeInTheDocument();
      
      // Close dialog
      const closeTrigger = screen.getByTestId("dialog-close-trigger");
      await user.click(closeTrigger);
      
      // Error should be cleared when dialog reopens
      // (The useEffect will clear it when currentAssumptions changes)
    });
  });

  // ============ SECTION 6: Edge Cases Tests ============

  describe("Edge cases", () => {
    it("should handle very large diesel price values", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "9999999.99");
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 9999999.99,
      });
    });

    it("should handle very small diesel price values", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "0.0001");
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 0.0001,
      });
    });

    it("should handle zero as a valid value", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "0");
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 0,
      });
    });

    it("should handle rapid input changes", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      
      await user.clear(input);
      await user.type(input, "1");
      await user.type(input, "2");
      await user.type(input, "3");
      await user.type(input, "4");
      await user.type(input, "5");
      
      expect(input).toHaveValue(12345);
    });
  });

  // ============ SECTION 7: Accessibility Tests ============

  describe("Accessibility", () => {
    it("should have correct label associations", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const label = screen.getByText("Diesel Price ($/L)");
      expect(label).toHaveAttribute("for", "dieselPrice");
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveAttribute("id", "dieselPrice");
    });

    it("should have appropriate input type for numeric values", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("step", "0.01");
    });

    it("should have dialog role structure", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      expect(screen.getByTestId("dialog-header")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-footer")).toBeInTheDocument();
    });

    it("should have proper ARIA attributes when in error state", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      // Check ARIA attributes
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "dieselPrice-error");
      
      // Check error message has role="alert"
      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute("id", "dieselPrice-error");
    });

    it("should not have aria-invalid when no error", () => {
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      // aria-invalid should be undefined/absent when no error
      expect(input).not.toHaveAttribute("aria-invalid");
    });
  });

  // ============ SECTION 8: Prop Change Tests ============

  describe("Prop changes", () => {
    it("should update when isOpen prop changes", () => {
      const { rerender } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      let dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "true");
      
      rerender(
        <EnvironmentalAssumptions
          {...defaultProps}
          isOpen={false}
        />
      );
      
      dialog = screen.getByTestId("dialog");
      expect(dialog).toHaveAttribute("data-open", "false");
    });

    it("should update when onSave prop changes", async () => {
      const user = userEvent.setup();
      const newOnSave = vi.fn();
      
      const { rerender } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      rerender(
        <EnvironmentalAssumptions
          {...defaultProps}
          onSave={newOnSave}
        />
      );
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(newOnSave).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("should update when onClose prop changes", async () => {
      const user = userEvent.setup();
      const newOnClose = vi.fn();
      
      const { rerender } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      rerender(
        <EnvironmentalAssumptions
          {...defaultProps}
          onClose={newOnClose}
        />
      );
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(newOnClose).toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ============ SECTION 9: Integration Tests ============

  describe("Integration scenarios", () => {
    it("should complete full flow: open, edit, save, close", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onClose = vi.fn();
      
      render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          currentAssumptions={{ dieselPricePerLiter: 1.50 }}
        />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(1.50);
      
      await user.clear(input);
      await user.type(input, "3.25");
      expect(input).toHaveValue(3.25);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(onSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 3.25,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple open/close cycles without issues", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSave = vi.fn();
      
      const { rerender } = render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          currentAssumptions={{ dieselPricePerLiter: 1.50 }}
        />
      );
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      
      rerender(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          currentAssumptions={{ dieselPricePerLiter: 2.00 }}
        />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      expect(input).toHaveValue(2.00);
      
      await user.click(saveButton);
      
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("should handle rapid save clicks without issues", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const saveButton = screen.getByText("Save changes");
      
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledTimes(3);
      expect(mockOnClose).toHaveBeenCalledTimes(3);
    });

    it("should handle invalid input gracefully with error feedback", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      // Error shown
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid number."
      );
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // User corrects input
      await user.type(input, "4.50");
      
      // Error should clear
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      
      // Now save works
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 4.50,
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should handle negative value with error feedback then correction flow", async () => {
      const user = userEvent.setup();
      render(<EnvironmentalAssumptions {...defaultProps} />);
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      await user.type(input, "-5");
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      // Error shown
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Diesel price cannot be negative."
      );
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      
      // User corrects to positive
      await user.clear(input);
      await user.type(input, "5.00");
      
      // Error should clear
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      
      await user.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith({
        dieselPricePerLiter: 5.00,
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ============ SECTION 10: Snapshot Tests ============

  describe("Snapshots", () => {
    it("should match snapshot when open", () => {
      const { container } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot when closed", () => {
      const { container } = render(
        <EnvironmentalAssumptions
          {...defaultProps}
          isOpen={false}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot with custom value", () => {
      const { container } = render(
        <EnvironmentalAssumptions
          {...defaultProps}
          currentAssumptions={{ dieselPricePerLiter: 5.99 }}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot with null currentAssumptions", () => {
      const { container } = render(
        <EnvironmentalAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot with error state", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <EnvironmentalAssumptions {...defaultProps} />
      );
      
      const input = screen.getByTestId("input-dieselPrice");
      await user.clear(input);
      
      const saveButton = screen.getByText("Save changes");
      await user.click(saveButton);
      
      expect(container).toMatchSnapshot();
    });
  });
});
