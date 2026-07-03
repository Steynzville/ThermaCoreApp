import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import MobileNavigation from "./MobileNavigation";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/dashboard" }),
  };
});

describe("MobileNavigation Component", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe("Rendering", () => {
    it("should render mobile navigation bar", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      // Use container.querySelector instead of getByRole to avoid multiple elements
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
      expect(nav?.className).toContain("fixed");
      expect(nav?.className).toContain("bottom-0");
    });

    it("should render all navigation items", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      // Use getAllByText since there might be multiple instances
      const dashboardElements = screen.getAllByText("Dashboard");
      expect(dashboardElements.length).toBeGreaterThan(0);
      
      const historyElements = screen.getAllByText("History");
      expect(historyElements.length).toBeGreaterThan(0);
      
      const adminElements = screen.getAllByText("Admin");
      expect(adminElements.length).toBeGreaterThan(0);
      
      const settingsElements = screen.getAllByText("Settings");
      expect(settingsElements.length).toBeGreaterThan(0);
    });

    it("should have fixed positioning at bottom", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("fixed");
      expect(nav?.className).toContain("bottom-0");
    });

    it("should have md:hidden class for desktop hiding", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("md:hidden");
    });
  });

  describe("Navigation", () => {
    it("should navigate to dashboard when dashboard button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const dashboardButton = screen.getAllByLabelText("Dashboard")[0];
      fireEvent.click(dashboardButton);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should navigate to history when history button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const historyButton = screen.getAllByLabelText("History")[0];
      fireEvent.click(historyButton);
      expect(mockNavigate).toHaveBeenCalledWith("/history");
    });

    it("should navigate to admin when admin button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const adminButton = screen.getAllByLabelText("Admin")[0];
      fireEvent.click(adminButton);
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });

    it("should navigate to settings when settings button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const settingsButton = screen.getAllByLabelText("Settings")[0];
      fireEvent.click(settingsButton);
      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });
  });

  describe("Active State", () => {
    it("should highlight active navigation item", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const dashboardButton = screen.getAllByLabelText("Dashboard")[0];
      expect(dashboardButton.className).toContain("text-blue-600");
      expect(dashboardButton.className).toContain("bg-blue-50");
    });

    it("should apply inactive styles to non-active items", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const historyButton = screen.getAllByLabelText("History")[0];
      expect(historyButton.className).toContain("text-gray-600");
    });
  });

  describe("Icons and Labels", () => {
    it("should render icons for each navigation item", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const icons = container.querySelectorAll("svg");
      // Should have at least 4 icons (one per nav item)
      expect(icons.length).toBeGreaterThanOrEqual(4);
    });

    it("should render text labels for each item", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const labels = screen.getAllByText(/Dashboard|History|Admin|Settings/);
      expect(labels.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Accessibility", () => {
    it("should have aria-label on all buttons", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const dashboardButtons = screen.getAllByLabelText("Dashboard");
      expect(dashboardButtons.length).toBeGreaterThan(0);
      
      const historyButtons = screen.getAllByLabelText("History");
      expect(historyButtons.length).toBeGreaterThan(0);
      
      const adminButtons = screen.getAllByLabelText("Admin");
      expect(adminButtons.length).toBeGreaterThan(0);
      
      const settingsButtons = screen.getAllByLabelText("Settings");
      expect(settingsButtons.length).toBeGreaterThan(0);
    });

    it("should have button type attribute", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("should have minimum touch target size", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.className).toContain("min-h-[48px]");
      });
    });

    it("should be keyboard navigable", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const firstButton = screen.getAllByLabelText("Dashboard")[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe("Dark Mode", () => {
    it("should have dark mode classes", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("dark:bg-gray-900");
      expect(nav?.className).toContain("dark:border-gray-700");
    });

    it("should have dark mode text colors on buttons", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.className).toMatch(/dark:/);
      });
    });
  });

  describe("Layout", () => {
    it("should use flexbox for layout", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = container.querySelector("nav");
      const innerDiv = nav?.querySelector("div");
      expect(innerDiv?.className).toContain("flex");
      expect(innerDiv?.className).toContain("justify-around");
    });

    it("should render items in correct order", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const buttons = screen.getAllByRole("button");
      // Check that the first button is Dashboard
      expect(buttons[0]).toHaveAttribute("aria-label", "Dashboard");
      // Check that the second button is History
      expect(buttons[1]).toHaveAttribute("aria-label", "History");
      // Check that the third button is Admin
      expect(buttons[2]).toHaveAttribute("aria-label", "Admin");
      // Check that the fourth button is Settings
      expect(buttons[3]).toHaveAttribute("aria-label", "Settings");
    });
  });

  describe("Responsive Design", () => {
    it("should have responsive padding", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = container.querySelector("nav");
      const innerDiv = nav?.querySelector("div");
      expect(innerDiv?.className).toContain("py-2");
    });

    it("should have z-index for proper stacking", () => {
      const { container } = render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("z-50");
    });
  });

  describe("Visual Feedback", () => {
    it("should have transition classes on buttons", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.className).toContain("transition-colors");
      });
    });

    it("should have hover states", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const historyButton = screen.getAllByLabelText("History")[0];
      expect(historyButton.className).toContain("hover:text-gray-900");
    });
  });
});
