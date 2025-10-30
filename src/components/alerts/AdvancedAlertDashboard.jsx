/**
 * Advanced Alert Dashboard Component
 *
 * Enterprise-grade alert management with real-time updates,
 * severity-based prioritization, acknowledgment workflow, and analytics.
 */

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Info,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import alertService, {
  ALERT_SEVERITY,
  ALERT_STATUS,
} from "../../services/alertService";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

const AdvancedAlertDashboard = ({ embedded = false }) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState(false);
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("open");
  const [searchTerm, setSearchTerm] = useState("");

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    // Use mock data for development
    const mockAlerts = alertService.generateMockAlerts(20);
    setAlerts(mockAlerts);
    setLoading(false);
  }, []);

  const loadStatistics = useCallback(async () => {
    const mockStats = alertService.generateMockAlertStatistics();
    setStatistics(mockStats);
  }, []);

  // Load alerts and statistics
  useEffect(() => {
    loadAlerts();
    loadStatistics();

    // Subscribe to real-time alerts
    const unsubscribe = alertService.subscribeToAlerts((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
      loadStatistics(); // Refresh statistics
    }, currentTenant?.id);

    // Refresh data periodically
    const interval = setInterval(() => {
      loadAlerts();
      loadStatistics();
    }, 600000); // Every 10 minutes

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentTenant?.id, loadAlerts, loadStatistics]);

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;

    const result = await alertService.acknowledgeAlert({
      alertId: selectedAlert.id,
      userId: user?.id || "current-user",
      notes: acknowledgmentNotes,
    });

    if (result.success) {
      // Update local alert state
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === selectedAlert.id
            ? {
                ...alert,
                acknowledged: true,
                acknowledgedBy: user?.email || "current-user",
                acknowledgedAt: new Date().toISOString(),
                status: ALERT_STATUS.ACKNOWLEDGED,
              }
            : alert,
        ),
      );
      setAcknowledgeDialogOpen(false);
      setAcknowledgmentNotes("");
      setSelectedAlert(null);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case ALERT_SEVERITY.CRITICAL:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case ALERT_SEVERITY.HIGH:
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case ALERT_SEVERITY.WARNING:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case ALERT_SEVERITY.INFO:
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case ALERT_SEVERITY.CRITICAL:
        return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case ALERT_SEVERITY.HIGH:
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case ALERT_SEVERITY.WARNING:
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case ALERT_SEVERITY.INFO:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
      default:
        return "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const getStatusBadge = (status, acknowledged) => {
    if (acknowledged || status === ALERT_STATUS.ACKNOWLEDGED) {
      return <Badge variant="secondary">Acknowledged</Badge>;
    }
    if (status === ALERT_STATUS.RESOLVED) {
      return <Badge variant="success">Resolved</Badge>;
    }
    if (status === ALERT_STATUS.ESCALATED) {
      return <Badge variant="destructive">Escalated</Badge>;
    }
    return <Badge variant="default">Open</Badge>;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    const severityMatch =
      filterSeverity === "all" || alert.severity === filterSeverity;
    const statusMatch = filterStatus === "all" || alert.status === filterStatus;
    const searchMatch =
      searchTerm === "" ||
      alert.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase());

    return severityMatch && statusMatch && searchMatch;
  });

  return (
    <div className={embedded ? "" : "min-h-screen bg-background p-4 sm:p-6"}>
      <div className={embedded ? "" : "max-w-7xl mx-auto space-y-6"}>
        {/* Header - only show when not embedded */}
        {!embedded && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Alert Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time monitoring and alert management system
              </p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Critical
                    </p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {statistics.bySeverity.critical}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Warning
                    </p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                      {statistics.bySeverity.warning}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Resolved
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {statistics.byStatus.resolved}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg. Resolution
                    </p>
                    <p className="text-2xl font-bold">
                      {statistics.avgResolutionTime}m
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value={ALERT_SEVERITY.CRITICAL}>
                    Critical
                  </SelectItem>
                  <SelectItem value={ALERT_SEVERITY.HIGH}>High</SelectItem>
                  <SelectItem value={ALERT_SEVERITY.WARNING}>
                    Warning
                  </SelectItem>
                  <SelectItem value={ALERT_SEVERITY.INFO}>Info</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={ALERT_STATUS.OPEN}>Open</SelectItem>
                  <SelectItem value={ALERT_STATUS.ACKNOWLEDGED}>
                    Acknowledged
                  </SelectItem>
                  <SelectItem value={ALERT_STATUS.RESOLVED}>
                    Resolved
                  </SelectItem>
                  <SelectItem value={ALERT_STATUS.ESCALATED}>
                    Escalated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts ({filteredAlerts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading alerts...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No alerts found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border-l-4 ${getSeverityColor(alert.severity)} p-4 rounded-lg`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold">{alert.type}</h3>
                            {getStatusBadge(alert.status, alert.acknowledged)}
                          </div>
                          <p className="text-base text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(alert.timestamp)}
                            </span>
                            <span>Device: {alert.device}</span>
                            {alert.value && (
                              <span>
                                Value: {alert.value} (Threshold:{" "}
                                {alert.threshold})
                              </span>
                            )}
                          </div>
                          {alert.acknowledgedBy && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Acknowledged by {alert.acknowledgedBy}
                            </p>
                          )}
                        </div>
                      </div>
                      {!alert.acknowledged &&
                        alert.status !== ALERT_STATUS.RESOLVED && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setAcknowledgeDialogOpen(true);
                            }}
                            className="w-full sm:w-auto mt-2 sm:mt-0"
                          >
                            Acknowledge
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acknowledge Dialog */}
      <Dialog
        open={acknowledgeDialogOpen}
        onOpenChange={setAcknowledgeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge Alert</DialogTitle>
            <DialogDescription>
              Add notes about this alert acknowledgment (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAlert && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{selectedAlert.type}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAlert.device} - {selectedAlert.message}
                </p>
              </div>
            )}
            <Textarea
              placeholder="Enter acknowledgment notes..."
              value={acknowledgmentNotes}
              onChange={(e) => setAcknowledgmentNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAcknowledgeDialogOpen(false);
                setAcknowledgmentNotes("");
                setSelectedAlert(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAcknowledge}>Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedAlertDashboard;
