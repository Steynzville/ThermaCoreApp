import { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";

const QuickActionTile = memo(({ action, handleQuickActionClick, permissions }) => {
  // Check permissions based on action requirements
  if (action.requiresAdminPanel && !permissions?.canAccessAdminPanel) {
    return null;
  }
  if (action.requiresSales && !permissions?.canViewSales) {
    return null;
  }
  if (action.requiresAnalytics && !permissions?.canViewAnalytics) {
    return null;
  }
  if (action.requiresProtocols && !permissions?.canViewProtocols) {
    return null;
  }
  return (
    <div
      key={action.name}
      className="action-tile"
      onClick={() => handleQuickActionClick(action.link)}
    >
      {action.name}
    </div>
  );
});

const Dashboard = ({ userRole }) => {
  const navigate = useNavigate();
  const { units, loading } = useUnits();
  const { permissions } = useAuth();

  const quickActions = [
    { name: "Sales Analytics", link: "/analytics", requiresSales: true },
    { name: "Generate Report", link: "/quick-action/generate-report" },
    { name: "Manage Users", link: "/admin", requiresAdminPanel: true },
    { name: "System Diagnostics", link: "/quick-action/system-diagnostics" },
    { name: "Advanced Analytics", link: "/advanced-analytics", requiresAnalytics: true },
    { name: "Protocol Manager", link: "/protocol-manager", requiresProtocols: true },
  ];

  const handleQuickActionClick = useCallback(
    (link) => {
      navigate(link);
    },
    [navigate],
  );

  // Apply the same filtering logic as GridView for consistency
  // Admins can see all units, others see limited units
  const filteredUnits = useMemo(() => {
    if (permissions?.canViewAllUnits) {
      return units;
    }
    return units.slice(0, 6);
  }, [permissions, units]);

  const { onlineCount, offlineCount, optimalCount, warningCount, criticalCount } = useMemo(() => {
    const online = filteredUnits.filter((unit) => unit.status === "online").length;
    const offline = filteredUnits.filter((unit) => unit.status === "offline").length;
    const optimal = filteredUnits.filter((unit) => unit.healthStatus === "Optimal").length;
    const warning = filteredUnits.filter((unit) => unit.healthStatus === "Warning").length;
    const critical = filteredUnits.filter((unit) => unit.healthStatus === "Critical").length;
    return {
      onlineCount: online,
      offlineCount: offline,
      optimalCount: optimal,
      warningCount: warning,
      criticalCount: critical,
    };
  }, [filteredUnits]);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (filteredUnits.length === 0) {
    return <div>No data available</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Dashboard Overview</h2>
      </header>

      {/* The rest of the dashboard remains the same */}
      <section className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          {quickActions.map((action) => (
            <QuickActionTile
              key={action.name}
              action={action}
              handleQuickActionClick={handleQuickActionClick}
              permissions={permissions}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
