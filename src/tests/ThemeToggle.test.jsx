import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "../components/ThemeToggle";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Moon: ({ size }) => <svg data-testid="moon-icon" data-size={size} />,
  Sun: ({ size }) => <svg data-testid="sun-icon" data-size={size} />,
}));

// Mock the ThemeContext
vi.mock("../context/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

import { useTheme } from "../context/ThemeContext";

describe("ThemeToggle", () => {
  const mockToggleTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithTheme = (theme = "light") => {
    useTheme.mockReturnValue({
      theme,
      toggleTheme: mockToggleTheme,
    });
    return render(<ThemeToggle />);
  };

  describe("basic rendering", () => {
    it("renders the toggle button", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("type", "button");
    });

    it("renders Moon icon when theme is light", () => {
      renderWithTheme("light");
      
      const moonIcon = screen.getByTestId("moon-icon");
      expect(moonIcon).toBeInTheDocument();
      expect(screen.queryByTestId("sun-icon")).not.toBeInTheDocument();
    });

    it("renders Sun icon when theme is dark", () => {
      renderWithTheme("dark");
      
      const sunIcon = screen.getByTestId("sun-icon");
      expect(sunIcon).toBeInTheDocument();
      expect(screen.queryByTestId("moon-icon")).not.toBeInTheDocument();
    });

    it("applies correct size to icons", () => {
      renderWithTheme("light");
      
      const moonIcon = screen.getByTestId("moon-icon");
      expect(moonIcon).toHaveAttribute("data-size", "24");
    });
  });

  describe("interaction", () => {
    it("calls toggleTheme when button is clicked", async () => {
      const user = userEvent.setup();
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      await user.click(button);
      
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it("calls toggleTheme on multiple clicks", async () => {
      const user = userEvent.setup();
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(mockToggleTheme).toHaveBeenCalledTimes(3);
    });
  });

  describe("styling", () => {
    it("applies correct classes for light theme", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toHaveClass("theme-toggle-responsive");
      expect(button).toHaveClass("p-3");
      expect(button).toHaveClass("rounded-full");
      expect(button).toHaveClass("bg-white/90");
      expect(button).toHaveClass("text-gray-800");
      expect(button).toHaveClass("shadow-lg");
      expect(button).toHaveClass("hover:shadow-xl");
      expect(button).toHaveClass("hover:scale-110");
      expect(button).toHaveClass("transition-all");
      expect(button).toHaveClass("duration-200");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("border-gray-300");
      expect(button).toHaveClass("backdrop-blur-sm");
    });

    it("applies correct classes for dark theme", () => {
      renderWithTheme("dark");
      
      const button = screen.getByRole("button");
      expect(button).toHaveClass("dark:bg-gray-800/90");
      expect(button).toHaveClass("dark:text-gray-200");
      expect(button).toHaveClass("dark:border-gray-600");
    });

    it("applies both light and dark theme classes simultaneously", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      // Light theme classes
      expect(button).toHaveClass("bg-white/90");
      expect(button).toHaveClass("text-gray-800");
      expect(button).toHaveClass("border-gray-300");
      // Dark theme classes should also be present (for when dark mode is active)
      expect(button).toHaveClass("dark:bg-gray-800/90");
      expect(button).toHaveClass("dark:text-gray-200");
      expect(button).toHaveClass("dark:border-gray-600");
    });
  });

  describe("accessibility", () => {
    it("has aria-label", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Toggle Theme");
    });

    it("has type='button' to prevent form submission", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("is focusable", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toBeVisible();
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe("edge cases", () => {
    it("handles undefined theme gracefully", () => {
      useTheme.mockReturnValue({
        theme: undefined,
        toggleTheme: mockToggleTheme,
      });
      render(<ThemeToggle />);
      
      // Should render Moon icon as fallback (since theme is not 'dark')
      const moonIcon = screen.getByTestId("moon-icon");
      expect(moonIcon).toBeInTheDocument();
    });

    it("handles null theme gracefully", () => {
      useTheme.mockReturnValue({
        theme: null,
        toggleTheme: mockToggleTheme,
      });
      render(<ThemeToggle />);
      
      // Should render Moon icon as fallback (since theme is not 'dark')
      const moonIcon = screen.getByTestId("moon-icon");
      expect(moonIcon).toBeInTheDocument();
    });

    it("handles toggleTheme being undefined gracefully", () => {
      useTheme.mockReturnValue({
        theme: "light",
        toggleTheme: undefined,
      });
      render(<ThemeToggle />);
      
      const button = screen.getByRole("button");
      // Clicking should not throw an error
      fireEvent.click(button);
      // Should still render
      expect(screen.getByTestId("moon-icon")).toBeInTheDocument();
    });
  });

  describe("hover and transition effects", () => {
    it("has hover scale transform", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:scale-110");
    });

    it("has hover shadow effect", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:shadow-xl");
    });

    it("has transition animations", () => {
      renderWithTheme("light");
      
      const button = screen.getByRole("button");
      expect(button).toHaveClass("transition-all");
      expect(button).toHaveClass("duration-200");
    });
  });

  describe("icon rendering", () => {
    it("renders Moon icon with correct attributes", () => {
      renderWithTheme("light");
      
      const moonIcon = screen.getByTestId("moon-icon");
      expect(moonIcon).toBeInTheDocument();
      expect(moonIcon.tagName).toBe("svg");
    });

    it("renders Sun icon with correct attributes", () => {
      renderWithTheme("dark");
      
      const sunIcon = screen.getByTestId("sun-icon");
      expect(sunIcon).toBeInTheDocument();
      expect(sunIcon.tagName).toBe("svg");
    });
  });
});
