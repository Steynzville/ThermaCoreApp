/**
 * Protocol Status Dashboard
 *
 * Visual dashboard showing overall protocol health,
 * connection status, and real-time metrics
 */

import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiGetJson } from "@/utils/apiFetch";

const skeletonIds = ['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4'];

const ProtocolStatusDashboard = ({ tenantId, onProtocolClick }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const url = `/api/v1/protocols/status${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      setStatus(data);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 600000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {skeletonIds.map((id) => (
          <Card key={id} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getProtocolHealth = (protocol) => {
    if (!protocol.connected) return 0;
    if (protocol.status !== "ready") return 50;
    if (protocol.is_heartbeat_stale) return 70;
    return 100;
  };

  const getHealthColor = (health) => {
    if (health >= 80) return "text-green-600";
    if (health >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthIcon = (health) => {
    if (health >= 80) return CheckCircle;
    if (health >= 50) return Activity;
    return AlertCircle;
  };

  const protocols = Object.values(status.protocols || {});
  const avgHealth = status.summary?.health_score || 0;

  return (
    <div className="space-y-6">
      {/* Overall Health Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Health Overview</span>
            <Badge
              variant={
                avgHealth >= 80
                  ? "default"
                  : avgHealth >= 50
                    ? "secondary"
                    : "destructive"
              }
            >
              {Math.round(avgHealth)}% Healthy
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Health</span>
                <span className="text-sm text-muted-foreground">
                  {status.summary.active_protocols}/
                  {status.summary.total_protocols} Active
                </span>
              </div>
              <Progress value={avgHealth} className="h-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Fully Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {status.summary.availability_summary?.fully_available || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Degraded</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {status.summary.availability_summary?.degraded || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unavailable</p>
                <p className="text-2xl font-bold text-red-600">
                  {status.summary.availability_summary?.unavailable || 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Protocol Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {protocols.map((protocol) => {
          const health = getProtocolHealth(protocol);
          const HealthIcon = getHealthIcon(health);
          const healthColor = getHealthColor(health);

          return (
            <Card
              key={protocol.name}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onProtocolClick?.(protocol.name)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold uppercase text-foreground">
                      {protocol.name}
                    </h3>
                    <Badge
                      variant={protocol.connected ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {protocol.status}
                    </Badge>
                  </div>
                  <HealthIcon className={`h-8 w-8 ${healthColor}`} />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Health</span>
                      <span className={`font-medium ${healthColor}`}>
                        {health}%
                      </span>
                    </div>
                    <Progress value={health} className="h-1.5" />
                  </div>

                  {protocol.last_heartbeat && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(protocol.last_heartbeat).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {protocol.metrics && (
                    <div className="pt-2 border-t">
                      {Object.entries(protocol.metrics)
                        .slice(0, 2)
                        .map(([metricKey, value]) => (
                          <div
                            key={`${protocol.name}-${metricKey}`}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-muted-foreground truncate">
                              {metricKey.replace(/_/g, " ")}:
                            </span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Protocols</p>
                <p className="text-2xl font-bold">
                  {status.summary.total_protocols}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {status.summary.active_protocols}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Uptime Rate</p>
                <p className="text-2xl font-bold">
                  {status.summary.total_protocols > 0
                    ? Math.round(
                        (status.summary.active_protocols /
                          status.summary.total_protocols) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Health Score</p>
                <p className="text-2xl font-bold">{Math.round(avgHealth)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProtocolStatusDashboard;
