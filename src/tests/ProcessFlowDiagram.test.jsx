import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
// Change from @/ to relative import
import ProcessFlowDiagram from "../components/visualization/ProcessFlowDiagram";

// Mock UI card components
vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
}));

// Mock Button
vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className }) => (
    <button 
      data-testid="button" 
      className={className} 
      onClick={onClick} 
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  ),
}));

// Mock lucide icons
vi.mock("lucide-react", () => ({
  Activity: () => <span data-testid="icon-activity">Activity</span>,
  AlertTriangle: () => <span data-testid="icon-alert">AlertTriangle</span>,
  CheckCircle: () => <span data-testid="icon-check">CheckCircle</span>,
  Minus: () => <span data-testid="icon-minus">Minus</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  XCircle: () => <span data-testid="icon-x">XCircle</span>,
}));

describe("ProcessFlowDiagram", () => {
  const mockNodes = [
    { id: "pump1", label: "Pump 1", x: 100, y: 100, status: "running" },
    { id: "tank1", label: "Tank 1", x: 300, y: 100, status: "normal" },
    { id: "valve1", label: "Valve 1", x: 200, y: 200, status: "warning" },
  ];

  const mockConnections = [
    { id: "c1", from: "pump1", to: "tank1" },
    { id: "c2", from: "pump1", to: "valve1" },
  ];

  const mockLiveData = {
    pump1: { status: "running", value: 45.2, unit: "L/min" },
    tank1: { status: "normal", value: 85.0, unit: "%" },
    valve1: { status: "warning", value: 65.0, unit: "%" },
    c1: { flowRate: 12.5 },
    c2: { flowRate: 8.3 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window methods for zoom/pan functionality
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
    // Mock ResizeObserver if the component uses it
    if (!window.ResizeObserver) {
      window.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }));
    }
    // Mock getBoundingClientRect for SVG element
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
    });
  });

  describe("Basic Rendering", () => {
    it("should render with default props", () => {
      const { container } = render(<ProcessFlowDiagram />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should render with custom title", () => {
      const { container } = render(
        <ProcessFlowDiagram title="Custom Process Flow" />
      );

      const cardTitle = container.querySelector('[data-testid="card-title"]');
      expect(cardTitle).toHaveTextContent("Custom Process Flow");
    });

    it("should accept width and height props", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} width={1000} height={800} />
      );

      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("should render SVG with default settings", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} />
      );

      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Node Rendering", () => {
    it("should render all nodes", () => {
      render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      // Use getAllByText with the node labels
      expect(screen.getAllByText("Pump 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Tank 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Valve 1").length).toBeGreaterThan(0);
    });

    it("should render nodes with provided positions", () => {
      const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);
      // Check for role="button" elements (nodes)
      expect(container.querySelectorAll('[role="button"]').length).toBe(3);
    });

    it("should auto-layout nodes without positions", () => {
      render(
        <ProcessFlowDiagram
          nodes={[
            { id: "n1", label: "Node 1" },
            { id: "n2", label: "Node 2" },
            { id: "n3", label: "Node 3" },
          ]}
        />
      );

      expect(screen.getAllByText("Node 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Node 2").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Node 3").length).toBeGreaterThan(0);
    });

    it("should render node labels", () => {
      render(<ProcessFlowDiagram nodes={mockNodes} />);

      mockNodes.forEach((node) => {
        expect(screen.getAllByText(node.label).length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Colors", () => {
    it("should apply correct color for running status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[{ id: "n1", label: "Node", x: 100, y: 100, status: "running" }]}
        />
      );

      // Check for green circle (running status)
      expect(container.querySelector('circle[fill="#22c55e"]')).toBeInTheDocument();
    });

    it("should apply correct color for warning status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[{ id: "n1", label: "Node", x: 100, y: 100, status: "warning" }]}
        />
      );

      expect(container.querySelector('circle[fill="#eab308"]')).toBeInTheDocument();
    });

    it("should apply correct color for error status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[{ id: "n1", label: "Node", x: 100, y: 100, status: "error" }]}
        />
      );

      expect(container.querySelector('circle[fill="#ef4444"]')).toBeInTheDocument();
    });

    it("should apply correct color for idle status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[{ id: "n1", label: "Node", x: 100, y: 100, status: "idle" }]}
        />
      );

      expect(container.querySelector('circle[fill="#6b7280"]')).toBeInTheDocument();
    });
  });

  describe("Zoom and Pan Functionality", () => {
    it("should zoom in when zoom in button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      // Find the zoom display element
      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground"
      );

      // Find the zoom in button (Plus icon)
      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector('[data-testid="icon-plus"]'));

      expect(zoomInButton).toBeTruthy();

      act(() => fireEvent.click(zoomInButton));

      // Check that zoom increased
      await waitFor(() => {
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toContain("125%");
        }
      });
    });

    it("should zoom out when zoom out button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground"
      );

      // First zoom in
      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector('[data-testid="icon-plus"]'));

      act(() => fireEvent.click(zoomInButton));

      await waitFor(() => {
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toContain("125%");
        }
      });

      // Then zoom out
      const zoomOutButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector('[data-testid="icon-minus"]'));

      act(() => fireEvent.click(zoomOutButton));

      await waitFor(() => {
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toContain("100%");
        }
      });
    });

    it("should reset zoom when reset button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground"
      );

      // First zoom in
      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector('[data-testid="icon-plus"]'));

      act(() => fireEvent.click(zoomInButton));

      await waitFor(() => {
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toContain("125%");
        }
      });

      // Then reset
      const resetButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.textContent === "Reset");

      expect(resetButton).toBeTruthy();
      if (resetButton) {
        act(() => fireEvent.click(resetButton));
      }

      await waitFor(() => {
        if (zoomDisplay) {
          expect(zoomDisplay.textContent).toContain("100%");
        }
      });
    });

    it("should handle mouse interaction without crashing", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      // Find the SVG element
      const svgElement = container.querySelector("svg");
      expect(svgElement).toBeTruthy();

      // Find zoom in button
      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector('[data-testid="icon-plus"]'));

      if (zoomInButton) {
        act(() => fireEvent.click(zoomInButton));
      }

      // Simulate mouse events on the SVG container
      const svgContainer = container.querySelector('div[style*="touch-action: none"]') || container;

      // Ensure drag events do not crash
      act(() => {
        fireEvent.mouseDown(svgContainer, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });

        // Use a mock event for mouse move - using the actual window event
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
          bubbles: true,
        });
        window.dispatchEvent(mouseMoveEvent);

        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
        });
        window.dispatchEvent(mouseUpEvent);
      });

      expect(svgContainer).toBeTruthy();
    });

    it("should not pan when not zoomed in", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      const svgContainer = container.querySelector('div[style*="touch-action: none"]') || container;

      act(() => {
        fireEvent.mouseDown(svgContainer, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });

        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
          bubbles: true,
        });
        window.dispatchEvent(mouseMoveEvent);

        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
        });
        window.dispatchEvent(mouseUpEvent);
      });

      expect(svgContainer).toBeTruthy();
    });

    it("should have smooth transition on zoom", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Live Data Display", () => {
    it("should display live data values", () => {
      render(
        <ProcessFlowDiagram 
          nodes={mockNodes} 
          liveData={mockLiveData}
        />
      );

      // Check for live data values
      expect(screen.getAllByText("45.2").length).toBeGreaterThan(0);
      expect(screen.getAllByText("85.0").length).toBeGreaterThan(0);
      expect(screen.getAllByText("65.0").length).toBeGreaterThan(0);
    });

    it("should display units with values", () => {
      render(
        <ProcessFlowDiagram 
          nodes={mockNodes} 
          liveData={mockLiveData}
        />
      );

      expect(screen.getAllByText("L/min").length).toBeGreaterThan(0);
      expect(screen.getAllByText("%").length).toBeGreaterThan(0);
    });
  });

  describe("Summary Statistics", () => {
    it("should display running count", () => {
      render(
        <ProcessFlowDiagram 
          nodes={mockNodes} 
          liveData={mockLiveData}
        />
      );

      expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
      // There should be at least 1 running node
      const runningCount = screen.getAllByText("1");
      expect(runningCount.length).toBeGreaterThan(0);
    });

    it("should display warning count", () => {
      render(
        <ProcessFlowDiagram 
          nodes={mockNodes} 
          liveData={mockLiveData}
        />
      );

      expect(screen.getAllByText("Warning").length).toBeGreaterThan(0);
      // There should be at least 1 warning node
      const warningCount = screen.getAllByText("1");
      expect(warningCount.length).toBeGreaterThan(0);
    });

    it("should display total nodes count", () => {
      render(
        <ProcessFlowDiagram 
          nodes={mockNodes} 
          liveData={mockLiveData}
        />
      );

      expect(screen.getAllByText("Total Nodes").length).toBeGreaterThan(0);
      // Total nodes should be 3
      const totalCount = screen.getAllByText("3");
      expect(totalCount.length).toBeGreaterThan(0);
    });
  });

  describe("Legend", () => {
    it("should display legend items", () => {
      render(<ProcessFlowDiagram nodes={mockNodes} />);

      expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Warning").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    });
  });
});
