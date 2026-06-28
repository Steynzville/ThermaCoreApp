/**
 * OPC-UA Node Browser Component
 *
 * Provides tree navigation, node subscription, metadata display,
 * and connection wizard for OPC-UA servers.
 */

import {
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  FileText,
  Folder,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiGetJson, apiPostJson } from "@/utils/apiFetch";

const OPCUANodeBrowser = ({ isOpen, onClose, tenantId }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [nodes, setNodes] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [subscribedNodes, setSubscribedNodes] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [nodeValues, setNodeValues] = useState(new Map());

  // Fetch root nodes
  const fetchRootNodes = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/v1/protocols/opcua/nodes${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      setNodes(data.nodes || []);
    } catch (_error) {
      toast.error("Failed to load OPC-UA node tree");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch child nodes
  const fetchChildNodes = async (nodeId) => {
    try {
      const url = `/api/v1/protocols/opcua/nodes/${encodeURIComponent(nodeId)}/children${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      return data.children || [];
    } catch (_error) {
      return [];
    }
  };

  // Toggle node expansion
  const toggleNode = async (nodeId) => {
    const newExpanded = new Set(expandedNodes);

    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);

      // Fetch children if not already loaded
      const node = findNode(nodes, nodeId);
      if (node && !node.children) {
        const children = await fetchChildNodes(nodeId);
        updateNodeChildren(nodes, nodeId, children);
      }
    }

    setExpandedNodes(newExpanded);
  };

  // Find node in tree
  const findNode = (nodeList, nodeId) => {
    for (const node of nodeList) {
      if (node.nodeId === nodeId) return node;
      if (node.children) {
        const found = findNode(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  // Update node children
  const updateNodeChildren = (nodeList, nodeId, children) => {
    for (const node of nodeList) {
      if (node.nodeId === nodeId) {
        node.children = children;
        return;
      }
      if (node.children) {
        updateNodeChildren(node.children, nodeId, children);
      }
    }
    setNodes([...nodeList]);
  };

  // Subscribe to node
  const subscribeToNode = async (node) => {
    try {
      const url = `/api/v1/protocols/opcua/subscribe${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url, {
        nodeId: node.nodeId,
        samplingInterval: 1000,
      });

      const newSubscribed = new Set(subscribedNodes);
      newSubscribed.add(node.nodeId);
      setSubscribedNodes(newSubscribed);
      toast.success(`Subscribed to ${node.displayName}`);
    } catch (_error) {
      toast.error("Failed to subscribe to node");
    }
  };

  // Unsubscribe from node
  const unsubscribeFromNode = async (node) => {
    try {
      const url = `/api/v1/protocols/opcua/unsubscribe${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url, {
        nodeId: node.nodeId,
      });

      const newSubscribed = new Set(subscribedNodes);
      newSubscribed.delete(node.nodeId);
      setSubscribedNodes(newSubscribed);
      toast.success(`Unsubscribed from ${node.displayName}`);
    } catch (_error) {
      toast.error("Failed to unsubscribe from node");
    }
  };

  // Render node tree
  const renderNode = (node, level = 0) => {
    const isExpanded = expandedNodes.has(node.nodeId);
    const isSubscribed = subscribedNodes.has(node.nodeId);
    const hasChildren =
      node.hasChildren || (node.children && node.children.length > 0);
    const isSelected = selectedNode?.nodeId === node.nodeId;

    // Filter by search term
    if (
      searchTerm &&
      !node.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return null;
    }

    return (
      <div key={node.nodeId} className="select-none">
        <button
          type="button"
          className={`flex items-center gap-2 p-2 rounded cursor-pointer w-full text-left transition-colors ${
            isSelected
              ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => setSelectedNode(node)}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.nodeId);
              }}
              className="p-0.5 hover:bg-slate-300/50 dark:hover:bg-slate-600/50 rounded text-slate-500 dark:text-slate-400"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {node.nodeClass === "Object" ? (
            <Folder className="h-4 w-4 text-blue-500" />
          ) : node.nodeClass === "Variable" ? (
            <FileText className="h-4 w-4 text-green-500" />
          ) : (
            <Database className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          )}

          <span className="flex-1 text-sm truncate">{node.displayName}</span>

          {node.nodeClass === "Variable" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                isSubscribed
                  ? unsubscribeFromNode(node)
                  : subscribeToNode(node);
              }}
              className="p-1 hover:bg-slate-300/50 dark:hover:bg-slate-600/50 rounded"
            >
              {isSubscribed ? (
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              )}
            </button>
          )}
        </button>

        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      fetchRootNodes();

      // Set up polling for subscribed node values
      const interval = setInterval(async () => {
        if (subscribedNodes.size > 0) {
          try {
            const url = `/api/v1/protocols/opcua/values${tenantId ? `?tenant_id=${tenantId}` : ""}`;
            const data = await apiGetJson(url);
            setNodeValues((prev) => {
              const updated = new Map(prev);
              Object.entries(data.values || {}).forEach(([k, v]) => {
                updated.set(k, v);
              });
              return updated;
            });
          } catch (_error) {}
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isOpen, subscribedNodes.size, fetchRootNodes, tenantId]);

  if (!isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>OPC-UA Node Browser</DrawerTitle>
            <DrawerDescription>
              Browse, subscribe to, and monitor OPC-UA server nodes
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 p-4 h-full">
            {/* Tree View */}
            <div className="flex-1 flex flex-col border rounded-lg">
              <div className="p-4 border-b space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search nodes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={fetchRootNodes}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{subscribedNodes.size} nodes subscribed</span>
                </div>
              </div>

              <ScrollArea className="flex-1 p-2">
                {loading && nodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    Loading nodes...
                  </div>
                ) : nodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No nodes available
                  </div>
                ) : (
                  <div>{nodes.map((node) => renderNode(node))}</div>
                )}
              </ScrollArea>
            </div>

            {/* Node Details - Hidden on mobile, or shown in a separate view */}
            {selectedNode && (
              <div className="border rounded-lg p-4 overflow-y-auto h-1/3">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {selectedNode.displayName}
                    </h3>
                    <Badge variant="outline">{selectedNode.nodeClass}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-slate-700 dark:text-slate-300 font-semibold">Node ID</Label>
                      <p className="text-sm break-all text-slate-900 dark:text-slate-100">{selectedNode.nodeId}</p>
                    </div>
                    {selectedNode.dataType && (
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300 font-semibold">Data Type</Label>
                        <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNode.dataType}</p>
                      </div>
                    )}
                    {selectedNode.value && (
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300 font-semibold">Current Value</Label>
                        <p className="text-lg font-bold text-primary dark:text-sky-400">
                          {nodeValues.get(selectedNode.nodeId) ||
                            selectedNode.value}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-full">
        <DialogHeader>
          <DialogTitle>OPC-UA Node Browser</DialogTitle>
          <DialogDescription>
            Browse, subscribe to, and monitor OPC-UA server nodes
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[600px] w-full">
          {/* Tree View */}
          <div className="flex-1 flex flex-col border rounded-lg">
            <div className="p-4 border-b space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={fetchRootNodes}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{subscribedNodes.size} nodes subscribed</span>
              </div>
            </div>

            <ScrollArea className="flex-1 p-2">
              {loading && nodes.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading nodes...
                </div>
              ) : nodes.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No nodes available
                </div>
              ) : (
                <div>{nodes.map((node) => renderNode(node))}</div>
              )}
            </ScrollArea>
          </div>

          {/* Node Details */}
          <div className="w-96 border rounded-lg p-4 overflow-y-auto flex-shrink-0">
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    {selectedNode.displayName}
                  </h3>
                  <Badge variant="outline">{selectedNode.nodeClass}</Badge>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Node ID
                    </Label>
                    <p className="text-sm font-mono break-all text-slate-900 dark:text-slate-100">
                      {selectedNode.nodeId}
                    </p>
                  </div>

                  {selectedNode.dataType && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        Data Type
                      </Label>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNode.dataType}</p>
                    </div>
                  )}

                  {selectedNode.accessLevel && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        Access Level
                      </Label>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNode.accessLevel}</p>
                    </div>
                  )}

                  {selectedNode.description && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        Description
                      </Label>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{selectedNode.description}</p>
                    </div>
                  )}

                  {subscribedNodes.has(selectedNode.nodeId) && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        Current Value
                      </Label>
                      <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">
                        {nodeValues.get(selectedNode.nodeId)?.value || "—"}
                      </p>
                      {nodeValues.get(selectedNode.nodeId)?.timestamp && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(
                            nodeValues.get(selectedNode.nodeId).timestamp,
                          ).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {selectedNode.nodeClass === "Variable" && (
                  <div className="pt-4">
                    {subscribedNodes.has(selectedNode.nodeId) ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => unsubscribeFromNode(selectedNode)}
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        Unsubscribe
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => subscribeToNode(selectedNode)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Subscribe
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a node to view details
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OPCUANodeBrowser;
