import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnalyticsPlaceholder from "./AnalyticsPlaceholder";

vi.mock("./PageHeader", () => ({
  default: ({ title, subtitle }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

describe("AnalyticsPlaceholder", () => {
  it("should render analytics title", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("should render subtitle", () => {
    render(<AnalyticsPlaceholder />);
    expect(
      screen.getByText("Detailed performance metrics and trends"),
    ).toBeInTheDocument();
  });

  it("should render performance metrics card", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText("Performance Metrics")).toBeInTheDocument();
  });

  it("should render trend analysis card", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText("Trend Analysis")).toBeInTheDocument();
  });

  it("should render system activity card", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText("System Activity")).toBeInTheDocument();
  });

  it("should render analytics dashboard heading", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
  });

  it("should render coming soon message", () => {
    render(<AnalyticsPlaceholder />);
    expect(screen.getByText(/Coming Soon/)).toBeInTheDocument();
  });
});
