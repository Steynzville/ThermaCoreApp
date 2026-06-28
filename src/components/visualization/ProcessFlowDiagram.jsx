/**
 * Process Flow Diagram Component
 *
 * SVG-based interactive process flow visualization with live data overlay
 * and real-time status indicators for industrial processes.
 */

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Minus,
  Plus,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const ProcessFlowDiagram = ({
  title = "Process Flow",
  nodes = [],
  connections = [],
  liveData = {},
  width = 800,
  height = 600,
  onNodeClick,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);
  const lastDistanceRef = useRef(null);
  const isPinchingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef(null);

  // Handle mouse and touch interactions for zoom and pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mouse drag for panning
    const handleMouseDown = (e) => {
      // Only pan if zoomed in (zoom > 1)
      if (zoom > 1 && e.button === 0) {
        isPanningRef.current = true;
        setIsPanning(true);
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (isPanningRef.current && lastPanPointRef.current) {
        const deltaX = e.clientX - lastPanPointRef.current.x;
        const deltaY = e.clientY - lastPanPointRef.current.y;

        setPanOffset((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
      setIsPanning(false);
      lastPanPointRef.current = null;
    };

    // Touch handlers for pinch-to-zoom and single-touch panning
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Two-finger pinch for zoom
        isPinchingRef.current = true;
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        lastDistanceRef.current = distance;
      } else if (e.touches.length === 1 && zoom > 1) {
        // Single-finger drag for panning (only when zoomed)
        isPanningRef.current = true;
        setIsPanning(true);
        lastPanPointRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        // Handle pinch zoom
        e.preventDefault();
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );

        if (lastDistanceRef.current) {
          const scale = distance / lastDistanceRef.current;
          setZoom((prevZoom) => Math.min(Math.max(prevZoom * scale, 0.5), 3));
        }
        lastDistanceRef.current = distance;
      } else if (
        e.touches.length === 1 &&
        isPanningRef.current &&
        lastPanPointRef.current
      ) {
        // Handle single-finger panning
        e.preventDefault();
        const deltaX = e.touches[0].clientX - lastPanPointRef.current.x;
        const deltaY = e.touches[0].clientY - lastPanPointRef.current.y;

        setPanOffset((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        lastPanPointRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchEnd = () => {
      isPinchingRef.current = false;
      lastDistanceRef.current = null;
      isPanningRef.current = false;
      setIsPanning(false);
      lastPanPointRef.current = null;
    };

    // Add mouse event listeners
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Add touch event listeners
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [zoom]);

  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(prevZoom + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(prevZoom - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Calculate node positions if not provided
  const positionedNodes = useMemo(() => {
    return nodes.map((node, index) => {
      if (node.x !== undefined && node.y !== undefined) {
        return node;
      }

      // Auto-layout in a grid
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const col = index % cols;
      const row = Math.floor(index / cols);
      const xSpacing = width / (cols + 1);
      const ySpacing = height / (Math.ceil(nodes.length / cols) + 1);

      return {
        ...node,
        x: xSpacing * (col + 1),
        y: ySpacing * (row + 1),
      };
    });
  }, [nodes, width, height]);

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
      case "running":
      case "normal":
        return "#22c55e"; // green
      case "warning":
        return "#eab308"; // yellow
      case "error":
      case "critical":
      case "offline":
        return "#ef4444"; // red
      case "idle":
        return "#6b7280"; // gray
      default:
        return "#94a3b8"; // gray
    }
  };

  const _getStatusIcon = (status) => {
    switch (status) {
      case "online":
      case "running":
      case "normal":
        return <CheckCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "error":
      case "critical":
      case "offline":
        return <XCircle className="h-4 w-4" />;
      case "idle":
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const renderConnection = (connection, index) => {
    const fromNode = positionedNodes.find((n) => n.id === connection.from);
    const toNode = positionedNodes.find((n) => n.id === connection.to);

    if (!fromNode || !toNode) return null;

    const x1 = fromNode.x;
    const y1 = fromNode.y;
    const x2 = toNode.x;
    const y2 = toNode.y;

    // Calculate control points for curved connections
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const offset = 30;

    // Perpendicular offset for curved path
    const cpX = midX - (dy / Math.sqrt(dx * dx + dy * dy)) * offset;
    const cpY = midY + (dx / Math.sqrt(dx * dx + dy * dy)) * offset;

    const flowRate = liveData[connection.id]?.flowRate || 0;
    const isActive = flowRate > 0;

    return (
      <g key={`connection-${index}`}>
        {/* Connection path */}
        <path
          d={`M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`}
          stroke={isActive ? "#3b82f6" : "#d1d5db"}
          strokeWidth={isActive ? 3 : 2}
          fill="none"
          strokeDasharray={isActive ? "none" : "5,5"}
          markerEnd="url(#arrowhead)"
        />

        {/* Flow rate label */}
        {isActive && flowRate && (
          <g>
            <rect
              x={midX - 30}
              y={midY - 12}
              width={60}
              height={24}
              className="fill-card stroke-blue-500"
              strokeWidth={1}
              rx={4}
            />
            <text
              x={midX}
              y={midY + 5}
              textAnchor="middle"
              fontSize="12"
              className="fill-blue-500"
              fontWeight="600"
            >
              {flowRate.toFixed(1)} L/s
            </text>
          </g>
        )}

        {/* Animated flow indicator */}
        {isActive && (
          <circle r="4" fill="#3b82f6">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={`M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`}
            />
          </circle>
        )}
      </g>
    );
  };

  const renderNode = (node, index) => {
    const nodeData = liveData[node.id] || {};
    const status = nodeData.status || node.status || "idle";
    const statusColor = getStatusColor(status);

    return (
      <g
        key={`node-${index}`}
        transform={`translate(${node.x}, ${node.y})`}
        onClick={() => onNodeClick?.(node)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNodeClick?.(node);
          }
        }}
        tabIndex={0}
        role="button"
        className="cursor-pointer"
        style={{ transition: "all 0.3s ease" }}
      >
        {/* Node background */}
        <rect
          x={-60}
          y={-40}
          width={120}
          height={80}
          className="fill-card hover:opacity-80"
          stroke={statusColor}
          strokeWidth={3}
          rx={8}
        />

        {/* Status indicator */}
        <circle
          cx={45}
          cy={-25}
          r={8}
          fill={statusColor}
          className={status === "running" ? "animate-pulse" : ""}
        />

        {/* Node type icon */}
        <circle cx={0} cy={-10} r={12} fill={statusColor} fillOpacity={0.2} />
        <text
          x={0}
          y={-6}
          textAnchor="middle"
          fontSize="14"
          fill={statusColor}
          fontWeight="600"
        >
          {node.icon || "●"}
        </text>

        {/* Node label */}
        <text
          x={0}
          y={15}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="var(--card-foreground)"
        >
          {node.label}
        </text>

        {/* Live data display */}
        {nodeData.value !== undefined && (
          <text
            x={0}
            y={30}
            textAnchor="middle"
            fontSize="11"
            fill="var(--card-foreground)"
          >
            {nodeData.value.toFixed(1)} {nodeData.unit || ""}
          </text>
        )}
      </g>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <Activity className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-foreground dark:text-white">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Running</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="whitespace-nowrap">Critical</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Zoom Controls */}
        <div className="flex items-center justify-end gap-2 mb-3 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomReset}
            className="h-8 px-2 text-xs"
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {/* Container for SVG with pan/zoom support - overflow hidden to contain content */}
        <div
          ref={containerRef}
          className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900"
          style={{
            touchAction: "none",
            cursor: isPanning ? "grabbing" : zoom > 1 ? "grab" : "default",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg
            aria-label={title}
            role="img"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            style={{
              minWidth: "300px",
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition:
                isPinchingRef.current || isPanning
                  ? "none"
                  : "transform 0.2s ease",
              userSelect: "none",
            }}
          >
            <title>{title}</title>
            {/* Define arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Render connections first (behind nodes) */}
            {connections.map(renderConnection)}

            {/* Render nodes */}
            {positionedNodes.map(renderNode)}
          </svg>
        </div>

        {/* Summary statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
          <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/20 rounded">
            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium">
              Running
            </div>
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {
                positionedNodes.filter(
                  (n) => (liveData[n.id]?.status || n.status) === "running",
                ).length
              }
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded">
            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium">
              Warning
            </div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {
                positionedNodes.filter(
                  (n) => (liveData[n.id]?.status || n.status) === "warning",
                ).length
              }
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-950/20 rounded">
            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium">
              Critical
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
              {
                positionedNodes.filter(
                  (n) => (liveData[n.id]?.status || n.status) === "critical",
                ).length
              }
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-medium">
              Total Nodes
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {positionedNodes.length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessFlowDiagram;
