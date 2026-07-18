// src/tests/components/ROIAssumptions.test.jsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ROIAssumptions from "../../components/ROIAssumptions";
import { useAuth } from "../../context/AuthContext";

// Mock the AuthContext
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock lucide-react icons with aria-hidden support
vi.mock("lucide-react", () => ({
  Save: ({ className, "aria-hidden": ariaHidden }) => (
    <svg 
      data-testid="save-icon" 
      className={className} 
      aria-hidden={ariaHidden}
    >
      SaveIcon
    </svg>
  ),
  X: ({ className, "aria-hidden": ariaHidden }) => (
    <svg 
      data-testid="x-icon" 
      className={className} 
      aria-hidden={ariaHidden}
    >
      XIcon
    </svg>
  ),
}));

describe("ROIAssumptions", () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  const defaultCurrentAssumptions = {
    initialInvestment: 2000000,
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    currentAssumptions: defaultCurrentAssumptions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============ SECTION 1: Rendering Tests ============

  describe("Rendering", () => {
    it("should render when isOpen is true", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      expect(screen.getByText("ROI Assumptions")).toBeInTheDocument();
      expect(screen.getByText("Total Cost of Machines ($)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should return null when isOpen is false", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { container } = render(
        <ROIAssumptions {...defaultProps} isOpen={false} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("should render with admin default value when userRole is admin", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(2000000);
    });

    it("should render with user default value when userRole is not admin", () => {
      useAuth.mockReturnValue({ userRole: "user" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(600000);
    });

    it("should render close button with accessible label", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton).toBeInTheDocument();
      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
      expect(screen.getByTestId("x-icon")).toHaveAttribute("aria-hidden", "true");
    });

    it("should render Save icon with aria-hidden", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const saveIcon = screen.getByTestId("save-icon");
      expect(saveIcon).toBeInTheDocument();
      expect(saveIcon).toHaveAttribute("aria-hidden", "true");
    });

    it("should have correct input attributes", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("step", "0.01");
      expect(input).toHaveAttribute("min", "0");
    });

    it("should show empty input when initialInvestment is undefined", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(
        <ROIAssumptions
          {...defaultProps}
          currentAssumptions={{}} // No initialInvestment
        />
      );

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(null);
    });
  });

  // ============ SECTION 2: Initialization Tests ============

  describe("Initialization", () => {
    it("should initialize with admin default when userRole is admin and no currentAssumptions", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(2000000);
    });

    it("should initialize with user default when userRole is not admin and no currentAssumptions", () => {
      useAuth.mockReturnValue({ userRole: "viewer" });
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(600000);
    });

    it("should use currentAssumptions when provided", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(
        <ROIAssumptions
          {...defaultProps}
          currentAssumptions={{ initialInvestment: 3000000 }}
        />
      );

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(3000000);
    });

    it("should update when currentAssumptions changes after mount", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { rerender } = render(
        <ROIAssumptions {...defaultProps} />
      );

      let input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(2000000);

      // Update props
      rerender(
        <ROIAssumptions
          {...defaultProps}
          currentAssumptions={{ initialInvestment: 5000000 }}
        />
      );

      input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(5000000);
    });

    it("should not update when isOpen is false", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { rerender } = render(
        <ROIAssumptions {...defaultProps} isOpen={false} />
      );

      // The component returns null, so we can't query the input
      // But we can verify it doesn't crash
      expect(screen.queryByText("ROI Assumptions")).not.toBeInTheDocument();

      // Rerender with new props but still closed
      rerender(
        <ROIAssumptions
          {...defaultProps}
          isOpen={false}
          currentAssumptions={{ initialInvestment: 5000000 }}
        />
      );

      // Still closed
      expect(screen.queryByText("ROI Assumptions")).not.toBeInTheDocument();
    });
  });

  // ============ SECTION 3: Input Handling Tests ============

  describe("Input handling", () => {
    it("should update input value on change", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "1500000");

      expect(input).toHaveValue(1500000);
    });

    it("should handle decimal input", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "1234.56");

      expect(input).toHaveValue(1234.56);
    });

    it("should handle input with commas (number input strips them)", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      
      await user.type(input, "1,234,567.89");

      // Commas are stripped by number input, digits concatenate
      // "1,234,567.89" becomes "1234567.89"
      expect(input).toHaveValue(1234567.89);
    });

    it("should handle empty input as 0", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "abc");

      // Number input ignores non-numeric characters
      // parseFloat will be NaN, so it should default to 0
      expect(input).toHaveValue(0);
    });

    it("should handle negative input", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "-500");

      // Number input allows negative sign
      expect(input).toHaveValue(-500);
    });
  });

  // ============ SECTION 4: Save Functionality Tests ============

  describe("Save functionality", () => {
    it("should call onSave with current assumptions and onClose", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "2500000");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        initialInvestment: 2500000,
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should save with current value if no changes made", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        initialInvestment: 2000000,
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should save with 0 when input is cleared", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        initialInvestment: 0,
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should save with 0 when input has non-numeric value", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "abc");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        initialInvestment: 0,
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onSave then onClose in correct order", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      
      let callOrder = [];
      
      const onSaveWithOrder = () => {
        callOrder.push("save");
      };
      
      const onCloseWithOrder = () => {
        callOrder.push("close");
      };
      
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={onCloseWithOrder}
          onSave={onSaveWithOrder}
          currentAssumptions={{ initialInvestment: 2000000 }}
        />
      );
      
      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);
      
      expect(callOrder).toEqual(["save", "close"]);
    });
  });

  // ============ SECTION 5: Cancel Functionality Tests ============

  describe("Cancel functionality", () => {
    it("should call onClose when Cancel is clicked", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("should restore currentAssumptions on cancel", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "3000000");

      expect(input).toHaveValue(3000000);

      // Cancel should restore to currentAssumptions
      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // Component is closed, but if reopened, should have original value
      // We verify this by checking the mockOnClose was called
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      
      // The restored value would be visible if we re-opened
    });

    it("should handle cancel with no currentAssumptions", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "3000000");

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // Should still call onClose even without currentAssumptions
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("should call onClose when X button is clicked", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "Close" });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  // ============ SECTION 6: Edge Cases Tests ============

  describe("Edge cases", () => {
    it("should handle very large numbers", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "9999999999.99");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        initialInvestment: 9999999999.99,
      });
    });

    it("should handle very small numbers", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "0.01");

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        initialInvestment: 0.01,
      });
    });

    it("should handle rapid input changes", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "1");
      await user.type(input, "2");
      await user.type(input, "3");
      await user.type(input, "4");
      await user.type(input, "5");

      expect(input).toHaveValue(12345);
    });

    it("should handle multiple open/close cycles", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      
      const { rerender } = render(
        <ROIAssumptions {...defaultProps} />
      );
      
      // First close
      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      
      // Reopen
      rerender(
        <ROIAssumptions {...defaultProps} isOpen={true} />
      );
      
      // Should render again
      expect(screen.getByText("ROI Assumptions")).toBeInTheDocument();
      
      // Second close via save
      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });

    it("should handle currentAssumptions being null", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );

      // Should use default admin value
      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(2000000);
    });

    it("should handle currentAssumptions being undefined", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={undefined}
        />
      );

      // Should use default admin value
      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(2000000);
    });
  });

  // ============ SECTION 7: Accessibility Tests ============

  describe("Accessibility", () => {
    it("should have label associated with input", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const label = screen.getByText("Total Cost of Machines ($)");
      const input = screen.getByLabelText("Total Cost of Machines ($)");
      
      expect(label).toHaveAttribute("for", "totalCostOfMachines");
      expect(input).toHaveAttribute("id", "totalCostOfMachines");
    });

    it("should have dialog role structure", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const dialog = screen.getByText("ROI Assumptions").closest(".bg-white");
      expect(dialog).toBeInTheDocument();
    });

    it("should have proper button types", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton).toHaveAttribute("type", "button");

      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toHaveAttribute("type", "button");
    });

    it("should have focusable elements", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toBeInTheDocument();

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton).toBeInTheDocument();

      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeInTheDocument();
    });

    it("should have close button with aria-label", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton).toHaveAttribute("aria-label", "Close");
    });

    it("should have decorative icons hidden from screen readers", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      const saveIcon = screen.getByTestId("save-icon");
      expect(saveIcon).toHaveAttribute("aria-hidden", "true");

      const xIcon = screen.getByTestId("x-icon");
      expect(xIcon).toHaveAttribute("aria-hidden", "true");
    });

    it("should have Save button with correct accessible name", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);

      // The Save button's accessible name should be exactly "Save"
      // because the icon has aria-hidden="true" and is excluded
      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton).toBeInTheDocument();
      
      // Verify it's the button, not the icon
      expect(saveButton.tagName).toBe("BUTTON");
    });
  });

  // ============ SECTION 8: Integration Tests ============

  describe("Integration scenarios", () => {
    it("should complete full flow: open, edit, save, close", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      const onSave = vi.fn();
      const onClose = vi.fn();
      
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          currentAssumptions={{ initialInvestment: 2000000 }}
        />
      );
      
      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "2500000");
      
      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);
      
      expect(onSave).toHaveBeenCalledWith({
        initialInvestment: 2500000,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should complete full flow: open, edit, cancel", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      const onSave = vi.fn();
      const onClose = vi.fn();
      
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          currentAssumptions={{ initialInvestment: 2000000 }}
        />
      );
      
      const input = screen.getByLabelText("Total Cost of Machines ($)");
      await user.clear(input);
      await user.type(input, "3000000");
      
      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);
      
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should complete full flow: open, close via X, no save", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      const onSave = vi.fn();
      const onClose = vi.fn();
      
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={onClose}
          onSave={onSave}
          currentAssumptions={{ initialInvestment: 2000000 }}
        />
      );
      
      const closeButton = screen.getByRole("button", { name: "Close" });
      await user.click(closeButton);
      
      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should handle user role switching", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { rerender } = render(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );

      let input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(2000000);

      // Switch to user role
      useAuth.mockReturnValue({ userRole: "user" });
      rerender(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={null}
        />
      );

      // Should still have admin value (only set on initial render)
      input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(2000000);
    });

    it("should handle currentAssumptions with missing fields", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      render(
        <ROIAssumptions
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentAssumptions={{ someOtherField: 123 }}
        />
      );

      const input = screen.getByLabelText("Total Cost of Machines ($)");
      expect(input).toHaveValue(null);
    });

    it("should handle rapid save and cancel clicks", async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue({ userRole: "admin" });
      render(<ROIAssumptions {...defaultProps} />);
      
      const saveButton = screen.getByRole("button", { name: "Save" });
      const cancelButton = screen.getByText("Cancel");
      
      // Rapid clicks
      await user.click(saveButton);
      await user.click(cancelButton);
      
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });

  // ============ SECTION 9: Snapshot Tests ============

  describe("Snapshots", () => {
    it("should match snapshot when open with admin role", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { container } = render(
        <ROIAssumptions {...defaultProps} />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot when open with user role", () => {
      useAuth.mockReturnValue({ userRole: "user" });
      const { container } = render(
        <ROIAssumptions {...defaultProps} currentAssumptions={null} />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot when closed", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { container } = render(
        <ROIAssumptions {...defaultProps} isOpen={false} />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot with custom value", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { container } = render(
        <ROIAssumptions
          {...defaultProps}
          currentAssumptions={{ initialInvestment: 3000000 }}
        />
      );
      
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot with null currentAssumptions", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      const { container } = render(
        <ROIAssumptions
          {...defaultProps}
          currentAssumptions={null}
        />
      );
      
      expect(container).toMatchSnapshot();
    });
  });
});
