import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FinancialAssumptions from "./FinancialAssumptions";

// Mock components
vi.mock("./ui/card", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <div>{children}</div>,
}));

describe("FinancialAssumptions", () => {
  const defaultProps = {
    assumptions: {
      electricityRate: 0.12,
      waterRate: 5.50,
      maintenanceCost: 1000,
      capitalCost: 50000,
      lifetimeYears: 20,
      discountRate: 0.05,
    },
  };

  it("should render financial assumptions", () => {
    render(<FinancialAssumptions {...defaultProps} />);
    expect(screen.getByText(/Financial Assumptions/i)).toBeInTheDocument();
  });

  it("should display electricity rate", () => {
    render(<FinancialAssumptions {...defaultProps} />);
    expect(screen.getByText(/electricity/i)).toBeInTheDocument();
  });

  it("should display water rate", () => {
    render(<FinancialAssumptions {...defaultProps} />);
    expect(screen.getByText(/water/i)).toBeInTheDocument();
  });

  it("should render with empty assumptions", () => {
    render(<FinancialAssumptions assumptions={{}} />);
    expect(screen.getByText(/Financial Assumptions/i)).toBeInTheDocument();
  });
});
