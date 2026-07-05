import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UnitTabNavigation from "../components/unit-details/UnitTabNavigation";

describe("UnitTabNavigation", () => {
  const mockSetActiveTab = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders all four tabs", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("History")).toBeInTheDocument();
      expect(screen.getByText("Alerts")).toBeInTheDocument();
      expect(screen.getByText("Client Details")).toBeInTheDocument();
    });

    it("renders the correct number of tabs", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(4);
    });

    it("renders tab buttons with correct type", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveAttribute("type", "button");
      });
    });
  });

  describe("active tab styling", () => {
    it("applies active styles to the active tab", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const overviewButton = screen.getByText("Overview");
      expect(overviewButton).toHaveClass("border-yellow-500");
      expect(overviewButton).toHaveClass("text-yellow-600");
      expect(overviewButton).not.toHaveClass("border-transparent");
    });

    it("applies inactive styles to non-active tabs", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const historyButton = screen.getByText("History");
      expect(historyButton).toHaveClass("border-transparent");
      expect(historyButton).toHaveClass("text-gray-500");
      expect(historyButton).not.toHaveClass("border-yellow-500");
      expect(historyButton).not.toHaveClass("text-yellow-600");
    });

    it("applies correct styles for dark mode to active tab", () => {
      render(
        <UnitTabNavigation activeTab="history" setActiveTab={mockSetActiveTab} />
      );
      
      const historyButton = screen.getByText("History");
      expect(historyButton).toHaveClass("dark:text-yellow-400");
    });

    it("applies correct styles for dark mode to inactive tabs", () => {
      render(
        <UnitTabNavigation activeTab="history" setActiveTab={mockSetActiveTab} />
      );
      
      const overviewButton = screen.getByText("Overview");
      expect(overviewButton).toHaveClass("dark:text-gray-400");
      expect(overviewButton).toHaveClass("dark:hover:text-gray-300");
    });

    it("applies hover styles to inactive tabs", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const historyButton = screen.getByText("History");
      expect(historyButton).toHaveClass("hover:text-gray-700");
      expect(historyButton).toHaveClass("hover:border-gray-300");
    });

    it("does not apply hover styles to active tab", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const overviewButton = screen.getByText("Overview");
      expect(overviewButton).not.toHaveClass("hover:text-gray-700");
      expect(overviewButton).not.toHaveClass("hover:border-gray-300");
    });
  });

  describe("tab switching", () => {
    it("calls setActiveTab with correct tab id when tab is clicked", async () => {
      const user = userEvent.setup();
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const historyButton = screen.getByText("History");
      await user.click(historyButton);
      
      expect(mockSetActiveTab).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith("history");
    });

    it("switches to Alerts tab when clicked", async () => {
      const user = userEvent.setup();
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const alertsButton = screen.getByText("Alerts");
      await user.click(alertsButton);
      
      expect(mockSetActiveTab).toHaveBeenCalledWith("alerts");
    });

    it("switches to Client Details tab when clicked", async () => {
      const user = userEvent.setup();
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const clientButton = screen.getByText("Client Details");
      await user.click(clientButton);
      
      expect(mockSetActiveTab).toHaveBeenCalledWith("client");
    });

    it("switches back to Overview tab when clicked", async () => {
      const user = userEvent.setup();
      render(
        <UnitTabNavigation activeTab="history" setActiveTab={mockSetActiveTab} />
      );
      
      const overviewButton = screen.getByText("Overview");
      await user.click(overviewButton);
      
      expect(mockSetActiveTab).toHaveBeenCalledWith("overview");
    });

    it("handles multiple tab clicks", async () => {
      const user = userEvent.setup();
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const historyButton = screen.getByText("History");
      await user.click(historyButton);
      await user.click(historyButton);
      await user.click(historyButton);
      
      expect(mockSetActiveTab).toHaveBeenCalledTimes(3);
      expect(mockSetActiveTab).toHaveBeenCalledWith("history");
    });
  });

  describe("styling", () => {
    it("applies container margin class", () => {
      const { container } = render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const containerDiv = container.firstChild;
      expect(containerDiv).toHaveClass("mb-6");
    });

    it("applies border to bottom of navigation", () => {
      const { container } = render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const borderDiv = container.querySelector('.border-b');
      expect(borderDiv).toBeInTheDocument();
      expect(borderDiv).toHaveClass("border-gray-200");
      expect(borderDiv).toHaveClass("dark:border-gray-700");
    });

    it("applies correct flex layout to nav", () => {
      const { container } = render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass("-mb-px");
      expect(nav).toHaveClass("flex");
      expect(nav).toHaveClass("space-x-8");
    });

    it("applies correct button styling", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const button = screen.getByText("Overview");
      expect(button).toHaveClass("py-2");
      expect(button).toHaveClass("px-1");
      expect(button).toHaveClass("border-b-2");
      expect(button).toHaveClass("font-medium");
      expect(button).toHaveClass("text-sm");
    });
  });

  describe("accessibility", () => {
    it("renders buttons with correct type to prevent form submission", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("renders navigation element for screen readers", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it("tabs are focusable", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
      
      const firstButton = buttons[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe("edge cases", () => {
    it("handles activeTab being undefined", () => {
      render(
        <UnitTabNavigation activeTab={undefined} setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveClass("border-transparent");
        expect(button).not.toHaveClass("border-yellow-500");
      });
    });

    it("handles activeTab being null", () => {
      render(
        <UnitTabNavigation activeTab={null} setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveClass("border-transparent");
        expect(button).not.toHaveClass("border-yellow-500");
      });
    });

    it("handles activeTab with invalid tab id", () => {
      render(
        <UnitTabNavigation activeTab="invalid-tab" setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveClass("border-transparent");
        expect(button).not.toHaveClass("border-yellow-500");
      });
    });

    it("handles rapid tab switching", async () => {
      const user = userEvent.setup();
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const historyButton = screen.getByText("History");
      const alertsButton = screen.getByText("Alerts");
      const clientButton = screen.getByText("Client Details");
      
      await user.click(historyButton);
      await user.click(alertsButton);
      await user.click(clientButton);
      await user.click(historyButton);
      
      expect(mockSetActiveTab).toHaveBeenCalledTimes(4);
      expect(mockSetActiveTab).toHaveBeenLastCalledWith("history");
    });
  });

  describe("tab order", () => {
    it("renders tabs in correct order", () => {
      render(
        <UnitTabNavigation activeTab="overview" setActiveTab={mockSetActiveTab} />
      );
      
      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveTextContent("Overview");
      expect(buttons[1]).toHaveTextContent("History");
      expect(buttons[2]).toHaveTextContent("Alerts");
      expect(buttons[3]).toHaveTextContent("Client Details");
    });
  });
});
