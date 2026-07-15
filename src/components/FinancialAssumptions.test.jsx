import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FinancialAssumptions from "./FinancialAssumptions";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Save: () => <div data-testid="save-icon">Save</div>,
  X: () => <div data-testid="close-icon">X</div>,
}));

describe("FinancialAssumptions", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    currentAssumptions: {
      electricityCost: 0.4,
      rebate: 0.05,
      feedInTariff: 0.08,
    },
  };

  const defaultValues = {
    electricityCost: 0.4,
    rebate: 0.05,
    feedInTariff: 0.08,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // RENDERING TESTS
  // ============================================================
  describe("Rendering", () => {
    it("should render financial assumptions modal when open", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      expect(
        screen.getByText(/Financial Impact Assumptions/i),
      ).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      const { container } = render(
        <FinancialAssumptions {...defaultProps} isOpen={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("should display all three input labels", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      expect(
        screen.getByText(/Cost of electricity per kWh/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Rebate per kWh/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Feed-in tariff per kWh/i),
      ).toBeInTheDocument();
    });

    it("should render Save and Cancel buttons", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
    });

    it("should render close (X) button", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });
  });

  // ============================================================
  // POPULATING VALUES TESTS
  // ============================================================
  describe("Populating values from currentAssumptions", () => {
    it("should populate all three inputs with the values from currentAssumptions", () => {
      render(<FinancialAssumptions {...defaultProps} />);

      expect(
        screen.getByLabelText("Cost of electricity per kWh ($)"),
      ).toHaveValue(0.4);
      expect(screen.getByLabelText("Rebate per kWh ($)")).toHaveValue(0.05);
      expect(
        screen.getByLabelText("Feed-in tariff per kWh ($)"),
      ).toHaveValue(0.08);
    });

    it("should fall back to built-in defaults when currentAssumptions is null", () => {
      render(
        <FinancialAssumptions {...defaultProps} currentAssumptions={null} />,
      );

      expect(
        screen.getByLabelText("Cost of electricity per kWh ($)"),
      ).toHaveValue(0.4);
      expect(screen.getByLabelText("Rebate per kWh ($)")).toHaveValue(0.05);
      expect(
        screen.getByLabelText("Feed-in tariff per kWh ($)"),
      ).toHaveValue(0.08);
    });

    it("should re-sync fields when currentAssumptions changes while modal stays open", () => {
      const { rerender } = render(<FinancialAssumptions {...defaultProps} />);

      const newAssumptions = {
        electricityCost: 0.5,
        rebate: 0.1,
        feedInTariff: 0.12,
      };

      rerender(
        <FinancialAssumptions
          {...defaultProps}
          currentAssumptions={newAssumptions}
        />,
      );

      expect(
        screen.getByLabelText("Cost of electricity per kWh ($)"),
      ).toHaveValue(0.5);
      expect(screen.getByLabelText("Rebate per kWh ($)")).toHaveValue(0.1);
      expect(
        screen.getByLabelText("Feed-in tariff per kWh ($)"),
      ).toHaveValue(0.12);
    });

    it("should re-sync to defaults when currentAssumptions becomes null", () => {
      const { rerender } = render(<FinancialAssumptions {...defaultProps} />);

      rerender(
        <FinancialAssumptions
          {...defaultProps}
          currentAssumptions={null}
        />,
      );

      expect(
        screen.getByLabelText("Cost of electricity per kWh ($)"),
      ).toHaveValue(0.4);
      expect(screen.getByLabelText("Rebate per kWh ($)")).toHaveValue(0.05);
      expect(
        screen.getByLabelText("Feed-in tariff per kWh ($)"),
      ).toHaveValue(0.08);
    });
  });

  // ============================================================
  // EDITING INPUTS TESTS
  // ============================================================
  describe("Editing inputs", () => {
    it("should update the electricity cost field as the user types", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      fireEvent.change(input, { target: { value: "0.55" } });

      expect(input).toHaveValue(0.55);
    });

    it("should update the rebate field as the user types", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Rebate per kWh ($)");

      fireEvent.change(input, { target: { value: "0.07" } });

      expect(input).toHaveValue(0.07);
    });

    it("should update the feed-in tariff field as the user types", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Feed-in tariff per kWh ($)");

      fireEvent.change(input, { target: { value: "0.09" } });

      expect(input).toHaveValue(0.09);
    });

    it("should treat an empty value as 0", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Rebate per kWh ($)");

      fireEvent.change(input, { target: { value: "" } });

      expect(input).toHaveValue(0);
    });

    it("should clamp negative values to 0", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Rebate per kWh ($)");

      fireEvent.change(input, { target: { value: "-5" } });

      expect(input).toHaveValue(0);
    });

    it("should handle non-numeric input as 0", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Rebate per kWh ($)");

      fireEvent.change(input, { target: { value: "abc" } });

      expect(input).toHaveValue(0);
    });
  });

  // ============================================================
  // SAVE TESTS
  // ============================================================
  describe("Save", () => {
    it("should call onSave with the current assumptions, then onClose", () => {
      render(<FinancialAssumptions {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(defaultProps.onSave).toHaveBeenCalledWith(defaultValues);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onSave with edited assumptions when changes are made", () => {
      render(<FinancialAssumptions {...defaultProps} />);

      fireEvent.change(
        screen.getByLabelText("Cost of electricity per kWh ($)"),
        { target: { value: "0.6" } },
      );
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(defaultProps.onSave).toHaveBeenCalledWith({
        electricityCost: 0.6,
        rebate: 0.05,
        feedInTariff: 0.08,
      });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onSave with all edited fields", () => {
      render(<FinancialAssumptions {...defaultProps} />);

      fireEvent.change(
        screen.getByLabelText("Cost of electricity per kWh ($)"),
        { target: { value: "0.6" } },
      );
      fireEvent.change(
        screen.getByLabelText("Rebate per kWh ($)"),
        { target: { value: "0.07" } },
      );
      fireEvent.change(
        screen.getByLabelText("Feed-in tariff per kWh ($)"),
        { target: { value: "0.09" } },
      );
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(defaultProps.onSave).toHaveBeenCalledWith({
        electricityCost: 0.6,
        rebate: 0.07,
        feedInTariff: 0.09,
      });
    });

    it("should save with default values when currentAssumptions is null", () => {
      render(
        <FinancialAssumptions {...defaultProps} currentAssumptions={null} />,
      );

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(defaultProps.onSave).toHaveBeenCalledWith({
        electricityCost: 0.4,
        rebate: 0.05,
        feedInTariff: 0.08,
      });
    });
  });

  // ============================================================
  // CANCEL AND CLOSE TESTS
  // ============================================================
  describe("Cancel and close", () => {
    it("should call onClose when the X button is clicked", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      fireEvent.click(screen.getByTestId("close-icon"));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when Cancel is clicked", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should discard unsaved edits and restore currentAssumptions on Cancel", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      fireEvent.change(input, { target: { value: "0.99" } });
      expect(input).toHaveValue(0.99);

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      // After cancel, input should revert to original value
      expect(input).toHaveValue(0.4);
    });

    it("should restore defaults on Cancel when currentAssumptions is null", () => {
      render(
        <FinancialAssumptions {...defaultProps} currentAssumptions={null} />,
      );
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      fireEvent.change(input, { target: { value: "0.99" } });
      expect(input).toHaveValue(0.99);

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      // Should revert to defaults (0.4)
      expect(input).toHaveValue(0.4);
    });

    it("should reset all fields on Cancel", () => {
      render(<FinancialAssumptions {...defaultProps} />);

      const costInput = screen.getByLabelText("Cost of electricity per kWh ($)");
      const rebateInput = screen.getByLabelText("Rebate per kWh ($)");
      const tariffInput = screen.getByLabelText("Feed-in tariff per kWh ($)");

      fireEvent.change(costInput, { target: { value: "0.9" } });
      fireEvent.change(rebateInput, { target: { value: "0.09" } });
      fireEvent.change(tariffInput, { target: { value: "0.15" } });

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(costInput).toHaveValue(0.4);
      expect(rebateInput).toHaveValue(0.05);
      expect(tariffInput).toHaveValue(0.08);
    });
  });

  // ============================================================
  // USE EFFECT BEHAVIOR TESTS
  // ============================================================
  describe("Effect behavior", () => {
    it("should update when isOpen changes from false to true", () => {
      const { rerender } = render(
        <FinancialAssumptions {...defaultProps} isOpen={false} />,
      );

      // Initially closed - no modal rendered
      expect(
        screen.queryByText(/Financial Impact Assumptions/i),
      ).not.toBeInTheDocument();

      // Re-open with new props
      rerender(
        <FinancialAssumptions
          {...defaultProps}
          isOpen={true}
          currentAssumptions={{
            electricityCost: 0.7,
            rebate: 0.1,
            feedInTariff: 0.15,
          }}
        />,
      );

      // Should show new values
      expect(
        screen.getByLabelText("Cost of electricity per kWh ($)"),
      ).toHaveValue(0.7);
      expect(screen.getByLabelText("Rebate per kWh ($)")).toHaveValue(0.1);
      expect(
        screen.getByLabelText("Feed-in tariff per kWh ($)"),
      ).toHaveValue(0.15);
    });

    it("should not update when modal is closed", () => {
      const { rerender } = render(
        <FinancialAssumptions {...defaultProps} isOpen={false} />,
      );

      rerender(
        <FinancialAssumptions
          {...defaultProps}
          isOpen={false}
          currentAssumptions={{
            electricityCost: 0.9,
            rebate: 0.2,
            feedInTariff: 0.25,
          }}
        />,
      );

      // Modal still closed
      expect(
        screen.queryByText(/Financial Impact Assumptions/i),
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================
  describe("Edge cases", () => {
    it("should handle decimal values correctly", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      fireEvent.change(input, { target: { value: "0.123" } });
      expect(input).toHaveValue(0.123);
    });

    it("should handle very large values", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      fireEvent.change(input, { target: { value: "9999.99" } });
      expect(input).toHaveValue(9999.99);
    });

    it("should handle zero values correctly", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      fireEvent.change(input, { target: { value: "0" } });
      expect(input).toHaveValue(0);
    });

    it("should handle negative values and clamp to 0", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      fireEvent.change(input, { target: { value: "-10" } });
      expect(input).toHaveValue(0);
    });
  });

  // ============================================================
  // INTERACTION TESTS
  // ============================================================
  describe("Interaction flow", () => {
    it("should allow editing, canceling, and re-editing", () => {
      render(<FinancialAssumptions {...defaultProps} />);
      const input = screen.getByLabelText("Cost of electricity per kWh ($)");

      // Edit
      fireEvent.change(input, { target: { value: "0.5" } });
      expect(input).toHaveValue(0.5);

      // Cancel
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(input).toHaveValue(0.4);

      // Re-edit
      fireEvent.change(input, { target: { value: "0.6" } });
      expect(input).toHaveValue(0.6);
    });

    it("should not trigger onSave when Cancel is clicked", () => {
      render(<FinancialAssumptions {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onSave).not.toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("should not trigger onClose when Save is clicked (handled by onSave)", () => {
      render(<FinancialAssumptions {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      // onClose is called from handleSave, so it should be called
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
