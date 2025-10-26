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
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should render all navigation items", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("History")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should have fixed positioning at bottom", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = screen.getByRole("navigation");
      expect(nav.className).toContain("fixed");
      expect(nav.className).toContain("bottom-0");
    });

    it("should have md:hidden class for desktop hiding", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = screen.getByRole("navigation");
      expect(nav.className).toContain("md:hidden");
    });
  });

  describe("Navigation", () => {
    it("should navigate to dashboard when dashboard button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const dashboardButton = screen.getByLabelText("Dashboard");
      fireEvent.click(dashboardButton);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should navigate to history when history button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const historyButton = screen.getByLabelText("History");
      fireEvent.click(historyButton);
      expect(mockNavigate).toHaveBeenCalledWith("/history");
    });

    it("should navigate to admin when admin button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const adminButton = screen.getByLabelText("Admin");
      fireEvent.click(adminButton);
      expect(mockNavigate).toHaveBeenCalledWith("/admin");
    });

    it("should navigate to settings when settings button is clicked", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const settingsButton = screen.getByLabelText("Settings");
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
      const dashboardButton = screen.getByLabelText("Dashboard");
      expect(dashboardButton.className).toContain("text-blue-600");
      expect(dashboardButton.className).toContain("bg-blue-50");
    });

    it("should apply inactive styles to non-active items", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const historyButton = screen.getByLabelText("History");
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
      expect(icons.length).toBe(4); // One icon per nav item
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
      expect(screen.getByLabelText("Dashboard")).toBeInTheDocument();
      expect(screen.getByLabelText("History")).toBeInTheDocument();
      expect(screen.getByLabelText("Admin")).toBeInTheDocument();
      expect(screen.getByLabelText("Settings")).toBeInTheDocument();
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
      const firstButton = screen.getByLabelText("Dashboard");
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe("Dark Mode", () => {
    it("should have dark mode classes", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = screen.getByRole("navigation");
      expect(nav.className).toContain("dark:bg-gray-900");
      expect(nav.className).toContain("dark:border-gray-700");
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
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const container = screen.getByRole("navigation").querySelector("div");
      expect(container?.className).toContain("flex");
      expect(container?.className).toContain("justify-around");
    });

    it("should render items in correct order", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute("aria-label", "Dashboard");
      expect(buttons[1]).toHaveAttribute("aria-label", "History");
      expect(buttons[2]).toHaveAttribute("aria-label", "Admin");
      expect(buttons[3]).toHaveAttribute("aria-label", "Settings");
    });
  });

  describe("Responsive Design", () => {
    it("should have responsive padding", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      expect(container?.className).toContain("py-2");
    });

    it("should have z-index for proper stacking", () => {
      render(
        <BrowserRouter>
          <MobileNavigation />
        </BrowserRouter>,
      );
      const nav = screen.getByRole("navigation");
      expect(nav.className).toContain("z-50");
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
      const historyButton = screen.getByLabelText("History");
      expect(historyButton.className).toContain("hover:text-gray-900");
    });
  });
});
