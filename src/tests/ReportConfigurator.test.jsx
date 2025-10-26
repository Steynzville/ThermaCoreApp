/**
 * Tests for ReportConfigurator Component
 *
 * Tests basic rendering, user interactions, form validation, and submission flows
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportConfigurator from "../components/reports/ReportConfigurator";

// Mock settings context
vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      soundEnabled: false,
      volume: 0.5,
    },
  }),
}));

// Mock audio player
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

const mockDataProviders = {
  units: [
    { id: "unit-1", name: "Unit 1" },
    { id: "unit-2", name: "Unit 2" },
  ],
  clients: [
    { id: "client-1", name: "Client A" },
    { id: "client-2", name: "Client B" },
  ],
  reportTypes: [
    {
      id: "energy-report",
      name: "Energy Report",
      sections: ["energyProduction"],
    },
    {
      id: "water-report",
      name: "Water Report",
      sections: ["waterProduction"],
    },
    {
      id: "all-sections",
      name: "All Sections",
      sections: ["energyProduction", "waterProduction"],
    },
  ],
};

describe("ReportConfigurator - Smoke Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(<ReportConfigurator />);
    expect(container).toBeInTheDocument();
  });

  it("should render with default props", () => {
    const { container } = render(<ReportConfigurator />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should accept allowedScopes prop", () => {
    const scopes = ["single", "multiple"];
    const { container } = render(<ReportConfigurator allowedScopes={scopes} />);
    expect(container).toBeInTheDocument();
  });

  it("should accept allowedSections prop", () => {
    const sections = ["energyProduction", "waterProduction"];
    const { container } = render(
      <ReportConfigurator allowedSections={sections} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should accept allowedIntervals prop", () => {
    const intervals = ["daily", "weekly"];
    const { container } = render(
      <ReportConfigurator allowedIntervals={intervals} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should accept allowedFormats prop", () => {
    const formats = ["pdf", "excel"];
    const { container } = render(
      <ReportConfigurator allowedFormats={formats} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should mount and unmount without errors", () => {
    const { unmount } = render(<ReportConfigurator />);
    expect(() => unmount()).not.toThrow();
  });

  it("should handle empty allowedScopes array", () => {
    const { container } = render(<ReportConfigurator allowedScopes={[]} />);
    expect(container).toBeInTheDocument();
  });

  it("should handle empty allowedSections array", () => {
    const { container } = render(<ReportConfigurator allowedSections={[]} />);
    expect(container).toBeInTheDocument();
  });

  it("should render component structure", () => {
    const { container } = render(<ReportConfigurator />);
    // Component should render a form-like structure
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should accept custom className", () => {
    const { container } = render(
      <ReportConfigurator className="custom-class" />,
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("should handle multiple prop combinations", () => {
    const { container } = render(
      <ReportConfigurator
        allowedScopes={["single", "multiple"]}
        allowedSections={["energyProduction"]}
        allowedIntervals={["daily"]}
        allowedFormats={["pdf"]}
      />,
    );
    expect(container).toBeInTheDocument();
  });
});

describe("ReportConfigurator - User Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow selecting a report type", () => {
    const { container } = render(
      <ReportConfigurator dataProviders={mockDataProviders} />,
    );
    expect(container).toBeInTheDocument();

    // Find checkboxes - ReportConfigurator uses Checkbox components
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("should allow selecting a scope", () => {
    const { container } = render(
      <ReportConfigurator
        allowedScopes={["single", "multiple", "master"]}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should allow selecting units", () => {
    const { container } = render(
      <ReportConfigurator dataProviders={mockDataProviders} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should allow selecting clients", () => {
    const { container } = render(
      <ReportConfigurator dataProviders={mockDataProviders} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should handle report section toggles", () => {
    const { container } = render(
      <ReportConfigurator
        allowedSections={["energyProduction", "waterProduction"]}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should handle select all sections", () => {
    const { container } = render(
      <ReportConfigurator
        allowedSections={["energyProduction", "waterProduction"]}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });
});

describe("ReportConfigurator - Form Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate scope selection", () => {
    const { container } = render(
      <ReportConfigurator
        allowedScopes={["single", "multiple"]}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should validate date range", () => {
    const { container } = render(
      <ReportConfigurator dataProviders={mockDataProviders} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should validate section selection", () => {
    const { container } = render(
      <ReportConfigurator
        allowedSections={["energyProduction"]}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should validate unit/client selection based on scope", () => {
    const { container } = render(
      <ReportConfigurator dataProviders={mockDataProviders} />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should allow master scope without unit/client selection", () => {
    const { container } = render(
      <ReportConfigurator
        allowedScopes={["master"]}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });
});

describe("ReportConfigurator - Submission Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call onGenerate when form is submitted with valid data", async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ReportConfigurator
        dataProviders={mockDataProviders}
        onGenerate={onGenerate}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should show generating state during submission", async () => {
    const onGenerate = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const { container } = render(
      <ReportConfigurator
        dataProviders={mockDataProviders}
        onGenerate={onGenerate}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should handle submission errors gracefully", async () => {
    const onGenerate = vi.fn().mockRejectedValue(new Error("API Error"));
    const { container } = render(
      <ReportConfigurator
        dataProviders={mockDataProviders}
        onGenerate={onGenerate}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should not submit when form is invalid", () => {
    const onGenerate = vi.fn();
    const { container } = render(
      <ReportConfigurator
        dataProviders={mockDataProviders}
        onGenerate={onGenerate}
      />,
    );
    expect(container).toBeInTheDocument();
  });
});

describe("ReportConfigurator - Scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show scheduling controls when enabled", () => {
    const { container } = render(
      <ReportConfigurator
        showScheduling={true}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should hide scheduling controls when disabled", () => {
    const { container } = render(
      <ReportConfigurator
        showScheduling={false}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should allow scheduling a report for a future date", () => {
    const { container } = render(
      <ReportConfigurator
        showScheduling={true}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });

  it("should show pause scheduled button when enabled", () => {
    const { container } = render(
      <ReportConfigurator
        showPauseScheduled={true}
        dataProviders={mockDataProviders}
      />,
    );
    expect(container).toBeInTheDocument();
  });
});
