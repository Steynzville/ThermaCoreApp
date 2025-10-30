/**
 * Process Flow Diagram Component
 *
 * SVG-based interactive process flow visualization with live data overlay
 * and real-time status indicators for industrial processes.
 */

import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useMemo } from "react";
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
              fill="white"
              stroke="#3b82f6"
              strokeWidth={1}
              rx={4}
            />
            <text
              x={midX}
              y={midY + 5}
              textAnchor="middle"
              fontSize="12"
              fill="#3b82f6"
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
          fill="white"
          stroke={statusColor}
          strokeWidth={3}
          rx={8}
          className="hover:opacity-80"
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
          className="fill-foreground"
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
            className="fill-muted-foreground"
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
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Running</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Critical</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto bg-gray-50 dark:bg-gray-900">
          <svg
            aria-label="Icon"
            role="img"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="min-w-full"
          >
            <title>Icon</title>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
            <div className="text-xs text-muted-foreground">Running</div>
            <div className="text-lg font-bold text-green-600">
              {
                positionedNodes.filter(
                  (n) => (liveData[n.id]?.status || n.status) === "running",
                ).length
              }
            </div>
          </div>
          <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
            <div className="text-xs text-muted-foreground">Warning</div>
            <div className="text-lg font-bold text-yellow-600">
              {
                positionedNodes.filter(
                  (n) => (liveData[n.id]?.status || n.status) === "warning",
                ).length
              }
            </div>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
            <div className="text-xs text-muted-foreground">Critical</div>
            <div className="text-lg font-bold text-red-600">
              {
                positionedNodes.filter(
                  (n) => (liveData[n.id]?.status || n.status) === "critical",
                ).length
              }
            </div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-muted-foreground">Total Nodes</div>
            <div className="text-lg font-bold">{positionedNodes.length}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessFlowDiagram;
