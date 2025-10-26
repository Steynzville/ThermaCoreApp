import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FinancialAssumptions from "./FinancialAssumptions";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Save: () => <div>Save</div>,
  X: () => <div>X</div>,
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

  it("should render financial assumptions modal when open", () => {
    render(<FinancialAssumptions {...defaultProps} />);
    expect(screen.getByText(/Financial Impact Assumptions/i)).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    const { container } = render(<FinancialAssumptions {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("should display electricity cost input", () => {
    render(<FinancialAssumptions {...defaultProps} />);
    expect(screen.getByText(/Cost of electricity/i)).toBeInTheDocument();
  });

  it("should render with default assumptions when not provided", () => {
    const props = { ...defaultProps, currentAssumptions: null };
    render(<FinancialAssumptions {...props} />);
    expect(screen.getByText(/Financial Impact Assumptions/i)).toBeInTheDocument();
  });
});
