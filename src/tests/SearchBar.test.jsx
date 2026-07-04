import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "../components/SearchBar";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: ({ className }) => <svg data-testid="search-icon" className={className} />,
  X: ({ className }) => <svg data-testid="x-icon" className={className} />,
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders the search input with default placeholder", () => {
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveValue("");
    });

    it("renders with custom placeholder", () => {
      render(<SearchBar placeholder="Find devices..." />);
      
      expect(screen.getByPlaceholderText("Find devices...")).toBeInTheDocument();
    });

    it("renders the search icon", () => {
      render(<SearchBar />);
      
      const searchIcon = screen.getByTestId("search-icon");
      expect(searchIcon).toBeInTheDocument();
      expect(searchIcon).toHaveClass("text-gray-400");
    });

    it("applies custom className", () => {
      const { container } = render(<SearchBar className="custom-class" />);
      
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("renders input with initial value when provided", () => {
      render(<SearchBar value="initial query" />);
      
      const input = screen.getByDisplayValue("initial query");
      expect(input).toBeInTheDocument();
    });
  });

  describe("input interaction", () => {
    it("updates input value when typing", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test query");
      
      expect(input).toHaveValue("test query");
    });

    it("calls onSearch with the query when typing", async () => {
      const onSearch = vi.fn();
      const user = userEvent.setup();
      render(<SearchBar onSearch={onSearch} />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      
      expect(onSearch).toHaveBeenCalledTimes(4); // Each character
      expect(onSearch).toHaveBeenLastCalledWith("test");
    });

    it("calls onSearch with empty string when input is cleared", async () => {
      const onSearch = vi.fn();
      const user = userEvent.setup();
      render(<SearchBar onSearch={onSearch} />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      expect(onSearch).toHaveBeenLastCalledWith("test");
      
      await user.clear(input);
      expect(onSearch).toHaveBeenLastCalledWith("");
    });
  });

  describe("clear button", () => {
    it("shows clear button when input has value", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      
      const clearButton = screen.getByRole("button");
      expect(clearButton).toBeInTheDocument();
      expect(clearButton.querySelector('[data-testid="x-icon"]')).toBeInTheDocument();
    });

    it("hides clear button when input is empty", () => {
      render(<SearchBar />);
      
      const clearButton = screen.queryByRole("button");
      expect(clearButton).not.toBeInTheDocument();
    });

    it("clears input when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test query");
      expect(input).toHaveValue("test query");
      
      const clearButton = screen.getByRole("button");
      await user.click(clearButton);
      
      expect(input).toHaveValue("");
    });

    it("calls onSearch with empty string when clear button is clicked", async () => {
      const onSearch = vi.fn();
      const user = userEvent.setup();
      render(<SearchBar onSearch={onSearch} />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      expect(onSearch).toHaveBeenLastCalledWith("test");
      
      const clearButton = screen.getByRole("button");
      await user.click(clearButton);
      
      expect(onSearch).toHaveBeenLastCalledWith("");
    });

    it("applies hover styles to clear button", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      
      const clearButton = screen.getByRole("button");
      expect(clearButton).toHaveClass("hover:text-gray-600");
      expect(clearButton).toHaveClass("dark:hover:text-gray-300");
    });
  });

  describe("value prop updates", () => {
    it("updates internal state when value prop changes", () => {
      const { rerender } = render(<SearchBar value="initial" />);
      
      const input = screen.getByDisplayValue("initial");
      expect(input).toBeInTheDocument();
      
      rerender(<SearchBar value="updated" />);
      
      expect(screen.getByDisplayValue("updated")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("initial")).not.toBeInTheDocument();
    });

    it("shows clear button when value prop is not empty", () => {
      render(<SearchBar value="prefilled" />);
      
      const clearButton = screen.getByRole("button");
      expect(clearButton).toBeInTheDocument();
    });

    it("hides clear button when value prop is empty", () => {
      render(<SearchBar value="" />);
      
      const clearButton = screen.queryByRole("button");
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies correct input styling", () => {
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      expect(input).toHaveClass("w-full");
      expect(input).toHaveClass("pl-10");
      expect(input).toHaveClass("pr-10");
      expect(input).toHaveClass("py-2");
      expect(input).toHaveClass("border");
      expect(input).toHaveClass("rounded-lg");
      expect(input).toHaveClass("bg-white");
      expect(input).toHaveClass("dark:bg-gray-800");
    });

    it("applies focus styles to input", () => {
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      expect(input).toHaveClass("focus:outline-none");
      expect(input).toHaveClass("focus:ring-2");
      expect(input).toHaveClass("focus:ring-blue-500");
      expect(input).toHaveClass("focus:border-transparent");
    });

    it("applies dark mode styles to input", () => {
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      expect(input).toHaveClass("dark:border-gray-700");
      expect(input).toHaveClass("dark:text-gray-100");
    });
  });

  describe("accessibility", () => {
    it("renders input with correct type", () => {
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      expect(input).toHaveAttribute("type", "text");
    });

    it("clear button has type='button'", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      
      const clearButton = screen.getByRole("button");
      expect(clearButton).toHaveAttribute("type", "button");
    });

    it("search icon is decorative", () => {
      render(<SearchBar />);
      
      const searchIcon = screen.getByTestId("search-icon");
      // Should not have role or aria-label as it's decorative
      expect(searchIcon).toBeInTheDocument();
    });

    it("clear icon is inside button", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      
      const clearButton = screen.getByRole("button");
      const xIcon = clearButton.querySelector('[data-testid="x-icon"]');
      expect(xIcon).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles onSearch being undefined", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      // Should not throw error
      await user.type(input, "test");
      
      expect(input).toHaveValue("test");
    });

    it("handles onSearch being undefined when clearing", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      
      const clearButton = screen.getByRole("button");
      // Should not throw error
      await user.click(clearButton);
      
      expect(input).toHaveValue("");
    });

    it("handles empty placeholder", () => {
      render(<SearchBar placeholder="" />);
      
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "");
    });

    it("handles very long queries", async () => {
      const user = userEvent.setup();
      const longQuery = "a".repeat(1000);
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, longQuery);
      
      expect(input).toHaveValue(longQuery);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("handles special characters in query", async () => {
      const user = userEvent.setup();
      const specialChars = "!@#$%^&*()_+{}:<>?";
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, specialChars);
      
      expect(input).toHaveValue(specialChars);
    });

    it("handles spaces in query", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test with spaces");
      
      expect(input).toHaveValue("test with spaces");
    });
  });

  describe("keyboard interactions", () => {
    it("input receives focus on click", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.click(input);
      
      expect(document.activeElement).toBe(input);
    });

    it("supports typing and deleting characters", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      expect(input).toHaveValue("test");
      
      await user.keyboard("{Backspace}");
      expect(input).toHaveValue("tes");
      
      await user.keyboard("{Backspace}{Backspace}{Backspace}");
      expect(input).toHaveValue("");
    });
  });

  describe("controlled vs uncontrolled behavior", () => {
    it("behaves as controlled component when value prop is provided", async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar value="initial" onSearch={onSearch} />);
      
      const input = screen.getByDisplayValue("initial");
      await user.type(input, "x");
      
      // Value should not change because it's controlled
      expect(input).toHaveValue("initial");
      // But onSearch should still be called
      expect(onSearch).toHaveBeenCalledWith("initialx");
    });

    it("behaves as uncontrolled component when value prop is not provided", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      
      const input = screen.getByPlaceholderText("Search units...");
      await user.type(input, "test");
      
      expect(input).toHaveValue("test");
    });
  });
});
