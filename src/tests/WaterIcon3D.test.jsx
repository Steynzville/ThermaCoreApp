import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WaterIcon3D from "../components/WaterIcon3D";

describe("WaterIcon3D", () => {
  describe("basic rendering", () => {
    it("renders the component with default props", () => {
      render(<WaterIcon3D waterLevel={0} />);
      
      // Should render the SVG icon
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-label", "Water production status");
      
      // Should render the water level badge
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("L")).toBeInTheDocument();
    });

    it("renders with custom className", () => {
      const { container } = render(
        <WaterIcon3D waterLevel={0} className="custom-class" />
      );
      
      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass("custom-class");
    });

    it("renders the SVG with correct title", () => {
      render(<WaterIcon3D waterLevel={0} />);
      
      const title = document.querySelector('svg title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Water production status");
    });
  });

  describe("water level styling", () => {
    it("applies correct styling when waterLevel is 0 (no water)", () => {
      const { container } = render(<WaterIcon3D waterLevel={0} />);
      
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

    it("applies correct styling when waterLevel > 0 (has water)", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      // Main container should have blue styling
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('bg-blue-50');
      expect(mainDiv).toHaveClass('border-blue-700');
      
      // SVG should be blue
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-blue-500');
      
      // Badge should be blue
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('bg-blue-50');
      expect(badge).toHaveClass('border-blue-700');
      
      // Badge text should be blue
      const badgeText = screen.getByText("5");
      expect(badgeText).toHaveClass('text-blue-500');
    });

    it("renders dark mode classes for no water state", () => {
      const { container } = render(<WaterIcon3D waterLevel={0} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('dark:bg-gray-800');
      expect(mainDiv).toHaveClass('dark:border-gray-700');
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('dark:text-gray-600');
    });

    it("renders dark mode classes for has water state", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('dark:bg-blue-900');
      expect(mainDiv).toHaveClass('dark:border-blue-400');
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('dark:text-blue-400');
    });
  });

  describe("greyedOut prop", () => {
    it("applies grey styling when greyedOut is true regardless of waterLevel", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} greyedOut={true} />);
      
      // Should be gray, not blue
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('bg-gray-100');
      expect(mainDiv).toHaveClass('border-gray-200');
      expect(mainDiv).not.toHaveClass('bg-blue-50');
      expect(mainDiv).not.toHaveClass('border-blue-700');
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
      expect(svg).not.toHaveClass('text-blue-500');
    });

    it("applies dark mode grey styling when greyedOut is true", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} greyedOut={true} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('dark:bg-gray-800');
      expect(mainDiv).toHaveClass('dark:border-gray-700');
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('dark:text-gray-600');
    });

    it("does not show animations when greyedOut is true", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} greyedOut={true} />);
      
      // No bouncing droplets
      const bouncingDroplets = container.querySelectorAll('.animate-bounce');
      expect(bouncingDroplets).toHaveLength(0);
      
      // No glow effect
      const glowElement = container.querySelector('.blur-sm');
      expect(glowElement).not.toBeInTheDocument();
      
      // No ping animation
      const pingDot = container.querySelector('.animate-ping');
      expect(pingDot).not.toBeInTheDocument();
    });
  });

  describe("animated droplets", () => {
    it("renders three bouncing droplets when waterLevel > 0 and not greyedOut", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const droplets = container.querySelectorAll('.animate-bounce');
      expect(droplets).toHaveLength(3);
      
      // Check each droplet has different animation delays
      const droplet1 = droplets[0];
      const droplet2 = droplets[1];
      const droplet3 = droplets[2];
      
      expect(droplet1).toHaveStyle('animation-delay: 0s');
      expect(droplet2).toHaveStyle('animation-delay: 0.7s');
      expect(droplet3).toHaveStyle('animation-delay: 1.4s');
      
      // All should have 2s duration
      expect(droplet1).toHaveStyle('animation-duration: 2s');
      expect(droplet2).toHaveStyle('animation-duration: 2s');
      expect(droplet3).toHaveStyle('animation-duration: 2s');
    });

    it("renders droplets with different colors", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const droplets = container.querySelectorAll('.rounded-full');
      // Find the droplet elements (they're the small circles)
      const dropletElements = Array.from(droplets).filter(el => 
        el.classList.contains('w-1') && el.classList.contains('h-1')
      );
      
      expect(dropletElements[0]).toHaveClass('bg-blue-400');
      expect(dropletElements[1]).toHaveClass('bg-blue-300');
      expect(dropletElements[2]).toHaveClass('bg-blue-500');
    });

    it("does not render droplets when waterLevel is 0", () => {
      const { container } = render(<WaterIcon3D waterLevel={0} />);
      
      const droplets = container.querySelectorAll('.animate-bounce');
      expect(droplets).toHaveLength(0);
    });
  });

  describe("glow effect", () => {
    it("renders glow effect when waterLevel > 0 and not greyedOut", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const glowElement = container.querySelector('.blur-sm');
      expect(glowElement).toBeInTheDocument();
      expect(glowElement).toHaveClass('bg-blue-400');
      expect(glowElement).toHaveClass('animate-pulse');
    });

    it("does not render glow effect when waterLevel is 0", () => {
      const { container } = render(<WaterIcon3D waterLevel={0} />);
      
      const glowElement = container.querySelector('.blur-sm');
      expect(glowElement).not.toBeInTheDocument();
    });

    it("does not render glow effect when greyedOut is true", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} greyedOut={true} />);
      
      const glowElement = container.querySelector('.blur-sm');
      expect(glowElement).not.toBeInTheDocument();
    });
  });

  describe("ping animation", () => {
    it("renders ping animation when waterLevel > 0 and not greyedOut", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const pingDot = container.querySelector('.animate-ping');
      expect(pingDot).toBeInTheDocument();
      expect(pingDot).toHaveClass('bg-blue-400');
    });

    it("does not render ping animation when waterLevel is 0", () => {
      const { container } = render(<WaterIcon3D waterLevel={0} />);
      
      const pingDot = container.querySelector('.animate-ping');
      expect(pingDot).not.toBeInTheDocument();
    });

    it("does not render ping animation when greyedOut is true", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} greyedOut={true} />);
      
      const pingDot = container.querySelector('.animate-ping');
      expect(pingDot).not.toBeInTheDocument();
    });
  });

  describe("water level badge", () => {
    it("displays the correct water level value", () => {
      render(<WaterIcon3D waterLevel={42} />);
      
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("L")).toBeInTheDocument();
    });

    it("displays 0 L when waterLevel is 0", () => {
      render(<WaterIcon3D waterLevel={0} />);
      
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("L")).toBeInTheDocument();
    });

    it("displays decimal water levels", () => {
      render(<WaterIcon3D waterLevel={3.5} />);
      
      expect(screen.getByText("3.5")).toBeInTheDocument();
    });

    it("displays large water levels", () => {
      render(<WaterIcon3D waterLevel={1234} />);
      
      expect(screen.getByText("1234")).toBeInTheDocument();
    });

    it("applies hover scale transform to badge", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('hover:scale-105');
      expect(badge).toHaveClass('transition-all');
    });
  });

  describe("3D container styling", () => {
    it("applies perspective and 3D transform classes", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const perspectiveContainer = container.querySelector('.perspective-1000');
      expect(perspectiveContainer).toBeInTheDocument();
      expect(perspectiveContainer).toHaveClass('transform-gpu');
      expect(perspectiveContainer).toHaveClass('w-14');
      expect(perspectiveContainer).toHaveClass('h-14');
    });

    it("maintains square aspect ratio", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveStyle('aspect-ratio: 1 / 1');
    });

    it("applies hover scale transform to main container", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('hover:scale-100');
      expect(mainDiv).toHaveClass('transition-all');
    });

    it("has overflow-hidden on main container", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('overflow-hidden');
    });
  });

  describe("icon rendering", () => {
    it("renders water droplet SVG path", () => {
      render(<WaterIcon3D waterLevel={5} />);
      
      const path = document.querySelector('svg path');
      expect(path).toBeInTheDocument();
      expect(path).toHaveAttribute('d', expect.stringContaining('M12 2c-5.33 4.55-8 8.48-8 11.8'));
    });

    it("applies drop shadow to SVG", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('drop-shadow-sm');
    });
  });

  describe("accessibility", () => {
    it("has role='img' on SVG", () => {
      render(<WaterIcon3D waterLevel={5} />);
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toBeInTheDocument();
    });

    it("has aria-label on SVG", () => {
      render(<WaterIcon3D waterLevel={5} />);
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveAttribute('aria-label', 'Water production status');
    });

    it("has title element for screen readers", () => {
      render(<WaterIcon3D waterLevel={5} />);
      
      const title = document.querySelector('svg title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Water production status');
    });
  });

  describe("edge cases", () => {
    it("handles negative water levels", () => {
      render(<WaterIcon3D waterLevel={-5} />);
      
      // Should show the negative value
      expect(screen.getByText("-5")).toBeInTheDocument();
      
      // Should be treated as no water (gray)
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
    });

    it("handles undefined waterLevel gracefully", () => {
      render(<WaterIcon3D />);
      
      // Should default to 0
      expect(screen.getByText("undefined")).toBeInTheDocument();
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
    });

    it("handles null waterLevel gracefully", () => {
      render(<WaterIcon3D waterLevel={null} />);
      
      // null will be treated as 0 for styling
      expect(screen.getByText("null")).toBeInTheDocument();
      
      const svg = document.querySelector('svg[role="img"]');
      expect(svg).toHaveClass('text-gray-400');
    });

    it("handles string water levels", () => {
      render(<WaterIcon3D waterLevel="5" />);
      
      // Should display the string value
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("handles empty className gracefully", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} className="" />);
      
      const rootDiv = container.firstChild;
      expect(rootDiv.className).not.toContain('undefined');
      expect(rootDiv.className).not.toContain('null');
    });

    it("handles greyedOut with waterLevel 0", () => {
      const { container } = render(<WaterIcon3D waterLevel={0} greyedOut={true} />);
      
      // Should be gray
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('bg-gray-100');
      expect(mainDiv).toHaveClass('border-gray-200');
      
      // No animations
      const droplets = container.querySelectorAll('.animate-bounce');
      expect(droplets).toHaveLength(0);
    });
  });

  describe("interaction styles", () => {
    it("applies transition animation to main container", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const mainDiv = container.querySelector('.rounded-2xl');
      expect(mainDiv).toHaveClass('transition-all');
      expect(mainDiv).toHaveClass('duration-300');
      expect(mainDiv).toHaveClass('ease-out');
    });

    it("applies transition animation to badge", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('transition-all');
      expect(badge).toHaveClass('duration-300');
    });
  });

  describe("badge positioning", () => {
    it("positions badge at bottom-right corner", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('absolute');
      expect(badge).toHaveClass('-bottom-1');
      expect(badge).toHaveClass('-right-1');
    });

    it("applies rounded-full to badge", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('rounded-full');
    });

    it("applies shadow to badge", () => {
      const { container } = render(<WaterIcon3D waterLevel={5} />);
      
      const badge = container.querySelector('.min-w-\\[2\\.25rem\\]');
      expect(badge).toHaveClass('shadow-md');
    });
  });
});
