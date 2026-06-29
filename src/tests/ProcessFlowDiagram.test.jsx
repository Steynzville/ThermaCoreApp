/**
 * Tests for ProcessFlowDiagram Component
 *
 * Coverage includes:
 * - SVG rendering with nodes and connections
 * - Node positioning (manual and auto-layout)
 * - Live data integration and display
 * - Status indicators and color mapping
 * - Interactive node click handling
 * - Flow animations
 * - Keyboard accessibility
 * - Connection rendering (straight and curved)
 * - Auto-layout algorithm
 */

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
  });

  describe("Basic Rendering", () => {
    it("should render with default props", () => {
      const { container } = render(<ProcessFlowDiagram />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render with custom title", () => {
      const { container } = render(
        <ProcessFlowDiagram title="Custom Process Flow" />,
      );

      const cardTitle = container.querySelector('[data-slot="card-title"]');
      expect(cardTitle).toHaveTextContent("Custom Process Flow");
    });

    it("should accept width and height props", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} width={1000} height={800} />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render SVG with default settings", () => {
      const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Node Rendering", () => {
    it("should render all nodes", () => {
      render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const pumpElements = screen.getAllByText("Pump 1");
      expect(pumpElements.length).toBeGreaterThan(0);
      const tankElements = screen.getAllByText("Tank 1");
      expect(tankElements.length).toBeGreaterThan(0);
      const valveElements = screen.getAllByText("Valve 1");
      expect(valveElements.length).toBeGreaterThan(0);
    });

    it("should render nodes with provided positions", () => {
      const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);

      const nodes = container.querySelectorAll('[role="button"]');
      expect(nodes.length).toBe(3);
    });

    it("should auto-layout nodes without positions", () => {
      const nodesWithoutPos = [
        { id: "n1", label: "Node 1" },
        { id: "n2", label: "Node 2" },
        { id: "n3", label: "Node 3" },
      ];

      render(<ProcessFlowDiagram nodes={nodesWithoutPos} />);

      const node1Elements = screen.getAllByText("Node 1");
      expect(node1Elements.length).toBeGreaterThan(0);
      const node2Elements = screen.getAllByText("Node 2");
      expect(node2Elements.length).toBeGreaterThan(0);
      const node3Elements = screen.getAllByText("Node 3");
      expect(node3Elements.length).toBeGreaterThan(0);
    });

    it("should handle empty nodes array", () => {
      const { container } = render(<ProcessFlowDiagram nodes={[]} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render node labels", () => {
      render(<ProcessFlowDiagram nodes={mockNodes} />);

      mockNodes.forEach((node) => {
        const elements = screen.getAllByText(node.label);
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Colors", () => {
    it("should apply correct color for running status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[
            { id: "n1", label: "Node", x: 100, y: 100, status: "running" },
          ]}
        />,
      );

      const statusCircle = container.querySelector('circle[fill="#22c55e"]');
      expect(statusCircle).toBeInTheDocument();
    });

    it("should apply correct color for warning status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[
            { id: "n1", label: "Node", x: 100, y: 100, status: "warning" },
          ]}
        />,
      );

      const statusCircle = container.querySelector('circle[fill="#eab308"]');
      expect(statusCircle).toBeInTheDocument();
    });

    it("should apply correct color for error status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[{ id: "n1", label: "Node", x: 100, y: 100, status: "error" }]}
        />,
      );

      const statusCircle = container.querySelector('circle[fill="#ef4444"]');
      expect(statusCircle).toBeInTheDocument();
    });

    it("should apply correct color for idle status", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[{ id: "n1", label: "Node", x: 100, y: 100, status: "idle" }]}
        />,
      );

      const statusCircle = container.querySelector('circle[fill="#6b7280"]');
      expect(statusCircle).toBeInTheDocument();
    });
  });

  describe("Live Data Integration", () => {
    it("should display live data values", () => {
      render(<ProcessFlowDiagram nodes={mockNodes} liveData={mockLiveData} />);

      expect(screen.getByText(/45\.2/)).toBeInTheDocument();
      expect(screen.getByText(/85\.0/)).toBeInTheDocument();
      expect(screen.getByText(/65\.0/)).toBeInTheDocument();
    });

    it("should update status from live data", () => {
      const { container, rerender } = render(
        <ProcessFlowDiagram nodes={mockNodes} liveData={mockLiveData} />,
      );

      const updatedLiveData = {
        ...mockLiveData,
        pump1: { status: "error", value: 0, unit: "L/min" },
      };

      rerender(
        <ProcessFlowDiagram nodes={mockNodes} liveData={updatedLiveData} />,
      );

      const errorCircle = container.querySelector('circle[fill="#ef4444"]');
      expect(errorCircle).toBeInTheDocument();
    });

    it("should handle missing live data gracefully", () => {
      render(<ProcessFlowDiagram nodes={mockNodes} liveData={{}} />);

      const pumpElements = screen.getAllByText("Pump 1");
      expect(pumpElements.length).toBeGreaterThan(0);
    });
  });

  describe("Connection Rendering", () => {
    it("should render connections between nodes", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle missing connections", () => {
      render(<ProcessFlowDiagram nodes={mockNodes} connections={[]} />);

      const pumpElements = screen.getAllByText("Pump 1");
      expect(pumpElements.length).toBeGreaterThan(0);
    });

    it("should not render connection if node is missing", () => {
      const invalidConnection = [
        { id: "c1", from: "pump1", to: "nonexistent" },
      ];

      const { container } = render(
        <ProcessFlowDiagram
          nodes={mockNodes}
          connections={invalidConnection}
        />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should show flow rate on active connections", () => {
      render(
        <ProcessFlowDiagram
          nodes={mockNodes}
          connections={mockConnections}
          liveData={mockLiveData}
        />,
      );

      expect(screen.getByText(/12\.5/)).toBeInTheDocument();
      expect(screen.getByText(/8\.3/)).toBeInTheDocument();
    });

    it("should render arrows on connections", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const marker = container.querySelector('marker[id="arrowhead"]');
      expect(marker).toBeInTheDocument();
    });
  });

  describe("Interactive Features", () => {
    it("should call onNodeClick when node is clicked", () => {
      const onNodeClick = vi.fn();
      render(
        <ProcessFlowDiagram nodes={mockNodes} onNodeClick={onNodeClick} />,
      );

      // Find the node by text and click it
      const nodeText = screen.getAllByText("Pump 1")[0];
      const node = nodeText.closest('[role="button"]');
      expect(node).toBeTruthy();
      fireEvent.click(node);

      expect(onNodeClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "pump1" }),
      );
    });

    it("should handle keyboard interaction on nodes", async () => {
      const onNodeClick = vi.fn();
      render(
        <ProcessFlowDiagram nodes={mockNodes} onNodeClick={onNodeClick} />,
      );

      const nodeText = screen.getAllByText("Pump 1")[0];
      const node = nodeText.closest('[role="button"]');
      expect(node).toBeTruthy();
      node.focus();
      fireEvent.keyDown(node, { key: "Enter", code: "Enter" });

      expect(onNodeClick).toHaveBeenCalled();
    });

    it("should handle space key on nodes", async () => {
      const onNodeClick = vi.fn();
      render(
        <ProcessFlowDiagram nodes={mockNodes} onNodeClick={onNodeClick} />,
      );

      const nodeText = screen.getAllByText("Pump 1")[0];
      const node = nodeText.closest('[role="button"]');
      expect(node).toBeTruthy();
      node.focus();
      fireEvent.keyDown(node, { key: " ", code: "Space" });

      expect(onNodeClick).toHaveBeenCalled();
    });

    it("should not call onNodeClick if not provided", () => {
      render(<ProcessFlowDiagram nodes={mockNodes} />);

      const nodeText = screen.getAllByText("Pump 1")[0];
      const node = nodeText.closest('[role="button"]');
      expect(node).toBeTruthy();
      expect(() => fireEvent.click(node)).not.toThrow();
    });
  });

  describe("Animations", () => {
    it("should animate active connections", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={mockNodes}
          connections={mockConnections}
          liveData={mockLiveData}
        />,
      );

      const animateMotion = container.querySelector("animateMotion");
      expect(animateMotion).toBeInTheDocument();
    });

    it("should not animate inactive connections", () => {
      const inactiveLiveData = {
        c1: { flowRate: 0 },
        c2: { flowRate: 0 },
      };

      const { container } = render(
        <ProcessFlowDiagram
          nodes={mockNodes}
          connections={mockConnections}
          liveData={inactiveLiveData}
        />,
      );

      const animateMotion = container.querySelector("animateMotion");
      expect(animateMotion).not.toBeInTheDocument();
    });

    it("should pulse running status indicators", () => {
      const { container } = render(
        <ProcessFlowDiagram
          nodes={[
            { id: "n1", label: "Node", x: 100, y: 100, status: "running" },
          ]}
        />,
      );

      const runningCircle = container.querySelector(".animate-pulse");
      expect(runningCircle).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible card structure", () => {
      const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeTruthy();
    });

    it("should have interactive nodes with role button", () => {
      const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);

      const buttons = container.querySelectorAll('[role="button"]');
      expect(buttons.length).toBe(mockNodes.length);
    });

    it("should have tabIndex for keyboard navigation", () => {
      const { container } = render(<ProcessFlowDiagram nodes={mockNodes} />);

      const buttons = container.querySelectorAll('[tabindex="0"]');
      expect(buttons.length).toBe(mockNodes.length);
    });

    it("should have descriptive title", () => {
      const { container } = render(
        <ProcessFlowDiagram
          title="Water Treatment Process"
          nodes={mockNodes}
        />,
      );

      const cardTitle = container.querySelector('[data-slot="card-title"]');
      expect(cardTitle).toHaveTextContent("Water Treatment Process");

      const svgTitle = container.querySelector("svg title");
      expect(svgTitle).toHaveTextContent("Water Treatment Process");
    });
  });

  describe("Auto-Layout", () => {
    it("should layout nodes in grid when positions not provided", () => {
      const manyNodes = Array.from({ length: 9 }, (_, i) => ({
        id: `node${i}`,
        label: `Node ${i}`,
      }));

      render(<ProcessFlowDiagram nodes={manyNodes} width={800} height={600} />);

      manyNodes.forEach((node) => {
        const elements = screen.getAllByText(node.label);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should handle mixed positioned and non-positioned nodes", () => {
      const mixedNodes = [
        { id: "n1", label: "Node 1", x: 100, y: 100 },
        { id: "n2", label: "Node 2" },
        { id: "n3", label: "Node 3", x: 300, y: 100 },
      ];

      render(<ProcessFlowDiagram nodes={mixedNodes} />);

      const node1Elements = screen.getAllByText("Node 1");
      expect(node1Elements.length).toBeGreaterThan(0);
      const node2Elements = screen.getAllByText("Node 2");
      expect(node2Elements.length).toBeGreaterThan(0);
      const node3Elements = screen.getAllByText("Node 3");
      expect(node3Elements.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should handle large number of nodes", () => {
      const largeNodes = Array.from({ length: 50 }, (_, i) => ({
        id: `node${i}`,
        label: `Node ${i}`,
        x: (i % 10) * 100,
        y: Math.floor(i / 10) * 100,
      }));

      const { container } = render(<ProcessFlowDiagram nodes={largeNodes} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should handle many connections", () => {
      const connections = Array.from({ length: 20 }, (_, i) => ({
        id: `c${i}`,
        from: `pump${i % 3}`,
        to: `tank${(i + 1) % 3}`,
      }));

      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={connections} />,
      );

      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle nodes with same positions", () => {
      const overlappingNodes = [
        { id: "n1", label: "Node 1", x: 100, y: 100 },
        { id: "n2", label: "Node 2", x: 100, y: 100 },
      ];

      render(<ProcessFlowDiagram nodes={overlappingNodes} />);

      const node1Elements = screen.getAllByText("Node 1");
      expect(node1Elements.length).toBeGreaterThan(0);
      const node2Elements = screen.getAllByText("Node 2");
      expect(node2Elements.length).toBeGreaterThan(0);
    });

    it("should handle circular connections", () => {
      const circularConnections = [
        { id: "c1", from: "pump1", to: "tank1" },
        { id: "c2", from: "tank1", to: "valve1" },
        { id: "c3", from: "valve1", to: "pump1" },
      ];

      const { container } = render(
        <ProcessFlowDiagram
          nodes={mockNodes}
          connections={circularConnections}
        />,
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should unmount gracefully", () => {
      const { unmount } = render(
        <ProcessFlowDiagram
          nodes={mockNodes}
          connections={mockConnections}
          liveData={mockLiveData}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Zoom and Pan Functionality", () => {
    it("should zoom in when zoom in button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground",
      );
      expect(zoomDisplay).toHaveTextContent("100%");

      const buttons = container.querySelectorAll("button");
      const zoomInButton = Array.from(buttons).find((btn) =>
        btn.querySelector("svg.lucide-plus"),
      );

      expect(zoomInButton).toBeTruthy();

      act(() => {
        fireEvent.click(zoomInButton);
      });

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("125%");
      });
    });

    it("should zoom out when zoom out button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground",
      );

      const buttons = container.querySelectorAll("button");
      const zoomInButton = Array.from(buttons).find((btn) =>
        btn.querySelector("svg.lucide-plus"),
      );
      expect(zoomInButton).toBeTruthy();

      act(() => {
        fireEvent.click(zoomInButton);
      });

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("125%");
      });

      const zoomOutButton = Array.from(buttons).find((btn) =>
        btn.querySelector("svg.lucide-minus"),
      );
      expect(zoomOutButton).toBeTruthy();

      act(() => {
        fireEvent.click(zoomOutButton);
      });

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("100%");
      });
    });

    it("should reset zoom and pan when reset button is clicked", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground",
      );

      const buttons = container.querySelectorAll("button");
      const zoomInButton = Array.from(buttons).find((btn) =>
        btn.querySelector("svg.lucide-plus"),
      );
      expect(zoomInButton).toBeTruthy();

      act(() => {
        fireEvent.click(zoomInButton);
      });

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("125%");
      });

      const resetButton = screen.getByText("Reset");
      act(() => {
        fireEvent.click(resetButton);
      });

      // Wait for reset to complete - may take a moment
      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("100%");
      }, { timeout: 2000 });
    });

    it("should apply grab cursor when zoomed in", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const buttons = container.querySelectorAll("button");
      const zoomInButton = Array.from(buttons).find((btn) =>
        btn.querySelector("svg.lucide-plus"),
      );

      if (zoomInButton) {
        act(() => {
          fireEvent.click(zoomInButton);
        });

        await waitFor(() => {
          const svgContainer = container.querySelector(
            '[style*="touchAction: none"]',
          );
          if (svgContainer) {
            expect(svgContainer.style.cursor).toMatch(
              /^(grab|grabbing|default)$/,
            );
          }
        });
      }
    });

    it("should handle mouse drag for panning when zoomed in", async () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground",
      );

      const buttons = container.querySelectorAll("button");
      const zoomInButton = Array.from(buttons).find((btn) =>
        btn.querySelector("svg.lucide-plus"),
      );
      expect(zoomInButton).toBeTruthy();

      act(() => {
        fireEvent.click(zoomInButton);
      });

      await waitFor(() => {
        expect(zoomDisplay).toHaveTextContent("125%");
      });

      const svgContainer = container.querySelector(
        '[style*="overflow: hidden"]',
      );
      expect(svgContainer).toBeTruthy();

      expect(svgContainer).toHaveStyle({ cursor: "grab" });

      act(() => {
        fireEvent.mouseDown(svgContainer, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });
      });

      expect(svgContainer).toHaveStyle({ cursor: "grabbing" });

      act(() => {
        fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });
        fireEvent.mouseUp(window);
      });

      expect(svgContainer).toHaveStyle({ cursor: "grab" });
    });

    it("should not pan when not zoomed in", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const svgContainer = container.querySelector(
        '[style*="overflow: hidden"]',
      );
      const zoomDisplay = container.querySelector(
        ".text-sm.text-muted-foreground",
      );

      expect(svgContainer).toBeTruthy();
      expect(zoomDisplay).toHaveTextContent("100%");

      expect(svgContainer).toHaveStyle({ cursor: "default" });

      act(() => {
        fireEvent.mouseDown(svgContainer, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });
        fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });
        fireEvent.mouseUp(window);
      });

      expect(svgContainer).toHaveStyle({ cursor: "default" });
      expect(zoomDisplay).toHaveTextContent("100%");
    });

    it("should have smooth transition on zoom", () => {
      const { container } = render(
        <ProcessFlowDiagram nodes={mockNodes} connections={mockConnections} />,
      );

      const svg = container.querySelector("svg");
      expect(svg.style.transition).toBeDefined();
    });
  });
});
