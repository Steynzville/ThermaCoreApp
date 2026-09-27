import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PowerIcon3D from "./PowerIcon3D";

describe("PowerIcon3D", () => {
  describe("basic rendering", () => {
    it("renders the component with default props", () => {
      render(<PowerIcon3D power={0} />);
      
      // Should render the SVG icon
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-label", "Power status");
      
      // Should render the power value badge
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("kW")).toBeInTheDocument();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <PowerIcon3D power={0} className="custom-class" />
      );
      
      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass("custom-class");
    });

    it("renders the SVG with correct title", () => {
      render(<PowerIcon3D power={0} />);
      
      const title = document.querySelector('svg title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Power status");
    });
  });

  describe("power level styling", () => {
    it("applies correct styling when power is 0 (offline)", () => {
      const { container } = render(<PowerIcon3D power={0} />);
      
      // Main container should have gray styling
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('bg-gray-100');
      expect(mainDiv).toHaveClass('border-gray-200');
      
      // SVG should be gray
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
      
      // Badge should be gray
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('border-gray-200');
      
      // Badge text should be gray
      const badgeText = screen.getByText("0");
      expect(badgeText).toHaveClass('text-gray-400');
    });

    it("applies correct styling when power > 0 (online)", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      // Main container should have green styling
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('bg-green-50');
      expect(mainDiv).toHaveClass('border-green-700');
      
      // SVG should be green
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-green-500');
      
      // Badge should be green
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('bg-green-50');
      expect(badge).toHaveClass('border-green-700');
      
      // Badge text should be green
      const badgeText = screen.getByText("5");
      expect(badgeText).toHaveClass('text-green-500');
    });

    it("renders dark mode classes for offline state", () => {
      const { container } = render(<PowerIcon3D power={0} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      // Should have dark mode classes
      expect(mainDiv).toHaveClass('dark:bg-gray-800');
      expect(mainDiv).toHaveClass('dark:border-gray-700');
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('dark:text-gray-600');
    });

    it("renders dark mode classes for online state", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('dark:bg-green-900');
      expect(mainDiv).toHaveClass('dark:border-lime-400');
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('dark:text-green-400');
    });
  });

  describe("glow effect", () => {
    it("renders glow effect when power > 0", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      // Glow element should exist
      const glowElement = container.querySelector('.rounded-2xl.blur-sm.scale-110');
      expect(glowElement).toBeInTheDocument();
      expect(glowElement).toHaveClass('bg-green-400');
      expect(glowElement).toHaveClass('animate-pulse');
    });

    it("does not render glow effect when power is 0", () => {
      const { container } = render(<PowerIcon3D power={0} />);
      
      const glowElement = container.querySelector('.rounded-2xl.blur-sm.scale-110');
      expect(glowElement).not.toBeInTheDocument();
    });
  });

  describe("animation effects", () => {
    it("renders pulse animation for online units", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const pingDot = container.querySelector('.animate-ping');
      expect(pingDot).toBeInTheDocument();
      expect(pingDot).toHaveClass('bg-green-400');
    });

    it("does not render pulse animation for offline units", () => {
      const { container } = render(<PowerIcon3D power={0} />);
      
      const pingDot = container.querySelector('.animate-ping');
      expect(pingDot).not.toBeInTheDocument();
    });
  });

  describe("power value badge", () => {
    it("displays the correct power value", () => {
      render(<PowerIcon3D power={42} />);
      
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("kW")).toBeInTheDocument();
    });

    it("displays 0 kW when power is 0", () => {
      render(<PowerIcon3D power={0} />);
      
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("kW")).toBeInTheDocument();
    });

    it("displays decimal power values", () => {
      render(<PowerIcon3D power={3.5} />);
      
      expect(screen.getByText("3.5")).toBeInTheDocument();
    });

    it("displays large power values", () => {
      render(<PowerIcon3D power={1234} />);
      
      expect(screen.getByText("1234")).toBeInTheDocument();
    });

    it("applies hover scale transform to badge", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('hover:scale-105');
      expect(badge).toHaveClass('transition-all');
    });
  });

  describe("3D container styling", () => {
    it("applies perspective and 3D transform classes", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const perspectiveContainer = container.querySelector('.perspective-1000');
      expect(perspectiveContainer).toBeInTheDocument();
      expect(perspectiveContainer).toHaveClass('transform-gpu');
      expect(perspectiveContainer).toHaveClass('w-14');
      expect(perspectiveContainer).toHaveClass('h-14');
    });

    it("maintains square aspect ratio", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveStyle('aspect-ratio: 1 / 1');
    });

    it("applies hover scale transform to main container", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('hover:scale-105');
      expect(mainDiv).toHaveClass('transition-all');
    });
  });

  describe("icon rendering", () => {
    it("renders lightning bolt SVG path", () => {
      render(<PowerIcon3D power={5} />);
      
      const path = document.querySelector('svg path');
      expect(path).toBeInTheDocument();
      expect(path).toHaveAttribute('d', expect.stringContaining('M13 2L3 14h6l-2 8 10-12h-6l2-8z'));
    });

    it("applies drop shadow to SVG", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('drop-shadow-sm');
    });
  });

  describe("accessibility", () => {
    it("has role='img' on SVG", () => {
      render(<PowerIcon3D power={5} />);
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toBeInTheDocument();
    });

    it("has aria-label on SVG", () => {
      render(<PowerIcon3D power={5} />);
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveAttribute('aria-label', 'Power status');
    });

    it("has title element for screen readers", () => {
      render(<PowerIcon3D power={5} />);
      
      const title = document.querySelector('svg title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Power status');
    });
  });

  describe("edge cases", () => {
    it("handles negative power values as online", () => {
      render(<PowerIcon3D power={-5} />);
      
      expect(screen.getByText("-5")).toBeInTheDocument();
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-green-500');
    });

    it("handles undefined power gracefully", () => {
      render(<PowerIcon3D />);
      
      expect(screen.getByText("0")).toBeInTheDocument();
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
    });

    it("handles null power gracefully", () => {
      render(<PowerIcon3D power={null} />);
      
      expect(screen.getByText("null")).toBeInTheDocument();
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
    });

    it("handles string power values", () => {
      render(<PowerIcon3D power="5" />);
      
      expect(screen.getByText("5")).toBeInTheDocument();
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-green-500');
    });

    it("handles string '0' as offline", () => {
      render(<PowerIcon3D power="0" />);
      
      expect(screen.getByText("0")).toBeInTheDocument();
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
    });

    it("handles NaN power values gracefully", () => {
      render(<PowerIcon3D power={NaN} />);
      
      expect(screen.getByText("0")).toBeInTheDocument();
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
    });

    it("handles empty className gracefully", () => {
      const { container } = render(<PowerIcon3D power={5} className="" />);
      
      const rootDiv = container.firstChild;
      expect(rootDiv.className).not.toContain('undefined');
      expect(rootDiv.className).not.toContain('null');
    });
  });

  describe("interaction styles", () => {
    it("applies transition animation to main container", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('transition-all');
      expect(mainDiv).toHaveClass('duration-300');
      expect(mainDiv).toHaveClass('ease-out');
    });

    it("applies transition animation to badge", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('transition-all');
      expect(badge).toHaveClass('duration-300');
    });
  });

  describe("badge positioning", () => {
    it("positions badge at bottom-right corner", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('absolute');
      expect(badge).toHaveClass('-bottom-1');
      expect(badge).toHaveClass('-right-1');
    });

    it("applies rounded-full to badge", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('rounded-full');
    });

    it("applies shadow to badge", () => {
      const { container } = render(<PowerIcon3D power={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('shadow-md');
    });
  });
});
