import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DeviceStatusIndicator from "../components/DeviceStatusIndicator";

// Mock the Badge component since it's a UI component
vi.mock("../components/ui/badge", () => ({
  Badge: ({ children, variant, className }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertTriangle: ({ className }) => <svg data-testid="alert-triangle" className={className} />,
  CheckCircle: ({ className }) => <svg data-testid="check-circle" className={className} />,
  Clock: ({ className }) => <svg data-testid="clock" className={className} />,
  WifiOff: ({ className }) => <svg data-testid="wifi-off" className={className} />,
  Wrench: ({ className }) => <svg data-testid="wrench" className={className} />,
}));

describe("DeviceStatusIndicator", () => {
  describe("rendering with different statuses", () => {
    it("renders online status with CheckCircle icon", () => {
      render(<DeviceStatusIndicator status="online" isOnline={true} />);
      
      const icon = screen.getByTestId("check-circle");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-green-500");
    });

    it("renders offline status with WifiOff icon", () => {
      render(<DeviceStatusIndicator status="offline" isOnline={false} />);
      
      const icon = screen.getByTestId("wifi-off");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-red-500");
    });

    it("renders maintenance status with Wrench icon", () => {
      render(<DeviceStatusIndicator status="maintenance" isOnline={true} />);
      
      const icon = screen.getByTestId("wrench");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-blue-500");
    });

    it("renders error status with AlertTriangle icon", () => {
      render(<DeviceStatusIndicator status="error" isOnline={true} />);
      
      const icon = screen.getByTestId("alert-triangle");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-red-500");
    });

    it("renders unknown status with Clock icon", () => {
      render(<DeviceStatusIndicator status="unknown" isOnline={true} />);
      
      const icon = screen.getByTestId("clock");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-gray-400");
    });

    it("renders default status with Clock icon when status is not recognized", () => {
      render(<DeviceStatusIndicator status="something-else" isOnline={true} />);
      
      const icon = screen.getByTestId("clock");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-gray-400");
    });
  });

  describe("rendering with alerts and alarms", () => {
    it("renders AlertTriangle with pulse animation when hasAlarm is true", () => {
      render(<DeviceStatusIndicator status="online" hasAlarm={true} isOnline={true} />);
      
      const icon = screen.getByTestId("alert-triangle");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-red-500");
      expect(icon).toHaveClass("animate-pulse");
    });

    it("renders AlertTriangle without pulse when hasAlert is true", () => {
      render(<DeviceStatusIndicator status="online" hasAlert={true} isOnline={true} />);
      
      const icon = screen.getByTestId("alert-triangle");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-yellow-500");
      expect(icon).not.toHaveClass("animate-pulse");
    });

    it("prioritizes hasAlarm over hasAlert", () => {
      render(<DeviceStatusIndicator status="online" hasAlert={true} hasAlarm={true} isOnline={true} />);
      
      const icon = screen.getByTestId("alert-triangle");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-red-500");
      expect(icon).toHaveClass("animate-pulse");
    });

    it("prioritizes isOnline false over alerts and alarms", () => {
      render(<DeviceStatusIndicator status="online" hasAlert={true} hasAlarm={true} isOnline={false} />);
      
      const icon = screen.getByTestId("wifi-off");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-red-500");
    });
  });

  describe("icon sizing", () => {
    it("renders xs size icon", () => {
      render(<DeviceStatusIndicator status="online" size="xs" />);
      
      const icon = screen.getByTestId("check-circle");
      expect(icon).toHaveClass("h-3 w-3");
    });

    it("renders sm size icon", () => {
      render(<DeviceStatusIndicator status="online" size="sm" />);
      
      const icon = screen.getByTestId("check-circle");
      expect(icon).toHaveClass("h-4 w-4");
    });

    it("renders md size icon", () => {
      render(<DeviceStatusIndicator status="online" size="md" />);
      
      const icon = screen.getByTestId("check-circle");
      expect(icon).toHaveClass("h-5 w-5");
    });

    it("renders lg size icon", () => {
      render(<DeviceStatusIndicator status="online" size="lg" />);
      
      const icon = screen.getByTestId("check-circle");
      expect(icon).toHaveClass("h-6 w-6");
    });

    it("renders default sm size when size is not specified", () => {
      render(<DeviceStatusIndicator status="online" />);
      
      const icon = screen.getByTestId("check-circle");
      expect(icon).toHaveClass("h-4 w-4");
    });

    it("renders default sm size when size is invalid", () => {
      render(<DeviceStatusIndicator status="online" size="invalid" />);
      
      const icon = screen.getByTestId("check-circle");
      expect(icon).toHaveClass("h-4 w-4");
    });
  });

  describe("showText mode", () => {
    it("renders status icon, badge, and health badge when showText is true", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
          healthStatus="optimal"
        />
      );
      
      // Icon should be present
      expect(screen.getByTestId("check-circle")).toBeInTheDocument();
      
      // Badge should be present
      const badges = screen.getAllByTestId("badge");
      expect(badges).toHaveLength(2); // Status badge + health badge
      
      // Check status badge
      expect(badges[0]).toHaveTextContent("Online");
      expect(badges[0]).toHaveClass("bg-green-100");
      
      // Check health badge
      expect(badges[1]).toHaveTextContent("Optimal");
      expect(badges[1]).toHaveClass("bg-green-100");
    });

    it("renders only status badge when healthStatus is unknown", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
          healthStatus="unknown"
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      expect(badges).toHaveLength(1);
      expect(badges[0]).toHaveTextContent("Online");
    });

    it("renders only status badge when healthStatus is not provided", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      expect(badges).toHaveLength(1);
      expect(badges[0]).toHaveTextContent("Online");
    });

    it("renders offline status with destructive badge", () => {
      render(
        <DeviceStatusIndicator 
          status="offline" 
          isOnline={false} 
          showText={true} 
        />
      );
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Offline");
      expect(badge).toHaveAttribute("data-variant", "destructive");
    });

    it("renders alarm status with destructive badge", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          hasAlarm={true} 
          isOnline={true} 
          showText={true} 
        />
      );
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Alarm");
      expect(badge).toHaveAttribute("data-variant", "destructive");
    });

    it("renders alert status with yellow badge", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          hasAlert={true} 
          isOnline={true} 
          showText={true} 
        />
      );
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Alert");
      expect(badge).toHaveClass("bg-yellow-100");
      expect(badge).toHaveClass("text-yellow-800");
    });
  });

  describe("showText mode - status badges", () => {
    it("renders Online badge for online status", () => {
      render(<DeviceStatusIndicator status="online" isOnline={true} showText={true} />);
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Online");
      expect(badge).toHaveClass("bg-green-100");
    });

    it("renders Offline badge for offline status", () => {
      render(<DeviceStatusIndicator status="offline" isOnline={false} showText={true} />);
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Offline");
      expect(badge).toHaveAttribute("data-variant", "destructive");
    });

    it("renders Maintenance badge for maintenance status", () => {
      render(<DeviceStatusIndicator status="maintenance" isOnline={true} showText={true} />);
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Maintenance");
      expect(badge).toHaveClass("bg-blue-100");
    });

    it("renders Error badge for error status", () => {
      render(<DeviceStatusIndicator status="error" isOnline={true} showText={true} />);
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Error");
      expect(badge).toHaveAttribute("data-variant", "destructive");
    });

    it("renders Unknown badge for unknown status", () => {
      render(<DeviceStatusIndicator status="unknown" isOnline={true} showText={true} />);
      
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Unknown");
      expect(badge).toHaveAttribute("data-variant", "outline");
    });
  });

  describe("health status badges", () => {
    it("renders Optimal health badge", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
          healthStatus="optimal"
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      // Find the health badge (it should be the second one)
      const healthBadge = badges[1];
      expect(healthBadge).toHaveTextContent("Optimal");
      expect(healthBadge).toHaveClass("bg-green-100");
    });

    it("renders Warning health badge", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
          healthStatus="warning"
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      const healthBadge = badges[1];
      expect(healthBadge).toHaveTextContent("Warning");
      expect(healthBadge).toHaveClass("bg-yellow-100");
    });

    it("renders Critical health badge", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
          healthStatus="critical"
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      const healthBadge = badges[1];
      expect(healthBadge).toHaveTextContent("Critical");
      expect(healthBadge).toHaveAttribute("data-variant", "destructive");
    });

    it("renders Unknown health badge for unknown health status", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
          healthStatus="something-else"
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      const healthBadge = badges[1];
      expect(healthBadge).toHaveTextContent("Unknown");
      expect(healthBadge).toHaveAttribute("data-variant", "outline");
    });

    it("handles case-insensitive health status values", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={true} 
          healthStatus="OPTIMAL"
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      const healthBadge = badges[1];
      expect(healthBadge).toHaveTextContent("Optimal");
      expect(healthBadge).toHaveClass("bg-green-100");
    });
  });

  describe("without showText mode (icon only)", () => {
    it("renders only icon without badges", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          showText={false} 
          healthStatus="optimal"
        />
      );
      
      expect(screen.getByTestId("check-circle")).toBeInTheDocument();
      
      // No badges should be rendered
      const badges = screen.queryAllByTestId("badge");
      expect(badges).toHaveLength(0);
    });

    it("includes tooltip title with status information", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          healthStatus="optimal"
        />
      );
      
      const container = screen.getByTestId("check-circle").parentElement;
      expect(container).toHaveAttribute("title", "Status: Online | Health: optimal");
    });

    it("includes tooltip title with only status when healthStatus is unknown", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
          healthStatus="unknown"
        />
      );
      
      const container = screen.getByTestId("check-circle").parentElement;
      expect(container).toHaveAttribute("title", "Status: Online");
    });

    it("includes tooltip title with only status when healthStatus is not provided", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          isOnline={true} 
        />
      );
      
      const container = screen.getByTestId("check-circle").parentElement;
      expect(container).toHaveAttribute("title", "Status: Online");
    });

    it("includes correct tooltip title for offline status", () => {
      render(
        <DeviceStatusIndicator 
          status="offline" 
          isOnline={false} 
        />
      );
      
      const container = screen.getByTestId("wifi-off").parentElement;
      expect(container).toHaveAttribute("title", "Status: Offline");
    });

    it("includes correct tooltip title for alarm status", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          hasAlarm={true} 
          isOnline={true} 
        />
      );
      
      const container = screen.getByTestId("alert-triangle").parentElement;
      expect(container).toHaveAttribute("title", "Status: Alarm Active");
    });

    it("includes correct tooltip title for alert status", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          hasAlert={true} 
          isOnline={true} 
        />
      );
      
      const container = screen.getByTestId("alert-triangle").parentElement;
      expect(container).toHaveAttribute("title", "Status: Alert Active");
    });
  });

  describe("className prop", () => {
    it("applies custom className to container", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          className="custom-class"
        />
      );
      
      const container = screen.getByTestId("check-circle").parentElement;
      expect(container).toHaveClass("custom-class");
    });

    it("applies custom className to container when showText is true", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          showText={true} 
          className="custom-class"
        />
      );
      
      const container = screen.getByTestId("check-circle").parentElement;
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("edge cases", () => {
    it("handles undefined status gracefully", () => {
      render(<DeviceStatusIndicator />);
      
      const icon = screen.getByTestId("clock");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-gray-400");
    });

    it("renders with default props when no props provided", () => {
      render(<DeviceStatusIndicator />);
      
      // Should render Clock icon (unknown status)
      expect(screen.getByTestId("clock")).toBeInTheDocument();
      
      // No badges
      const badges = screen.queryAllByTestId("badge");
      expect(badges).toHaveLength(0);
    });

    it("handles null healthStatus gracefully", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          showText={true} 
          healthStatus={null}
        />
      );
      
      const badges = screen.getAllByTestId("badge");
      expect(badges).toHaveLength(1); // Only status badge, no health badge
    });

    it("handles undefined healthStatus gracefully in tooltip", () => {
      render(
        <DeviceStatusIndicator 
          status="online" 
          healthStatus={undefined}
        />
      );
      
      const container = screen.getByTestId("check-circle").parentElement;
      expect(container).toHaveAttribute("title", "Status: Online");
    });
  });
});
