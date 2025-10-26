import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserReportsView from "./UserReportsView";

vi.mock("./PageHeader", () => ({
  default: () => <div data-testid="page-header">Page Header</div>,
}));

vi.mock("./reports/ReportConfigurator", () => ({
  default: () => (
    <div data-testid="report-configurator">Report Configurator</div>
  ),
}));

describe("UserReportsView", () => {
  it("should render page header", () => {
    render(<UserReportsView />);
    expect(screen.getByTestId("page-header")).toBeInTheDocument();
  });

  it("should render report configurator", () => {
    render(<UserReportsView />);
    expect(screen.getByTestId("report-configurator")).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = render(<UserReportsView />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<UserReportsView className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
