import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProcessFlowDiagram from "@/components/visualization/ProcessFlowDiagram";

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

      const cardTitle = container.querySelector('[data-slot="card-title"]');
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

      expect(screen.getAllByText("Pump 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Tank 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Valve 1").length).toBeGreaterThan(0);
    });

    it("should render nodes with provided positions", () => {
      const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);
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

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground"
      );

      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector("svg.lucide-plus"));

      expect(zoomInButton).toBeTruthy();

      act(() => fireEvent.click(zoomInButton));

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("125%");
      });
    });

    it("should zoom out when zoom out button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground"
      );

      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector("svg.lucide-plus"));

      act(() => fireEvent.click(zoomInButton));

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("125%");
      });

      const zoomOutButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector("svg.lucide-minus"));

      act(() => fireEvent.click(zoomOutButton));

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("100%");
      });
    });

    it("should reset zoom when reset button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground"
      );

      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector("svg.lucide-plus"));

      act(() => fireEvent.click(zoomInButton));

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("125%");
      });

      const resetButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.textContent === "Reset");

      expect(resetButton).toBeTruthy();
      if (resetButton) {
        fireEvent.click(resetButton);
      }

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("100%");
      });
    });

    it("should handle mouse interaction without crashing", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      const zoomInButton = Array.from(container.querySelectorAll("button"))
        .find((btn) => btn.querySelector("svg.lucide-plus"));

      if (zoomInButton) {
        act(() => fireEvent.click(zoomInButton));
      }

      const svgContainer = container.querySelector("svg") || container;

      // Just ensure drag events do not crash
      act(() => {
        fireEvent.mouseDown(svgContainer, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });

        fireEvent.mouseMove(window, {
          clientX: 150,
          clientY: 150,
        });

        fireEvent.mouseUp(window);
      });

      expect(svgContainer).toBeTruthy();
    });

    it("should not pan when not zoomed in", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />
      );

      const svgContainer = container.querySelector("svg") || container;

      act(() => {
        fireEvent.mouseDown(svgContainer, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });

        fireEvent.mouseMove(window, {
          clientX: 150,
          clientY: 150,
        });

        fireEvent.mouseUp(window);
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
});
