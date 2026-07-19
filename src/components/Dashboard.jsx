import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  Package,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { units } from "../data/mockUnits";
import TenantSwitcher from "./admin/TenantSwitcher";
import EnhancedStatusDial from "./Dashboard/EnhancedStatusDial";
import QuickActionCard from "./Dashboard/QuickActionCard";
import UnitSummary from "./Dashboard/UnitSummary";
import NotificationBell from "./NotificationBell";
import PerformanceDashboard from "./PerformanceDashboard";
import HighTechToggle from "./ui/HighTechToggle";

// Enhanced Dashboard Component
const Dashboard = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useAuth();
  // ✅ FIX: Only destructure currentTenant - isAdmin comes from AuthContext
  const { currentTenant } = useTenant();
  const [currentView, setCurrentView] = useState("operator"); // "operator" or "performance"

  // Single source of truth for admin status - derived from AuthContext
  const isAdminUser = userRole === "admin" || user?.role === "admin";

  // Check if admin has made a selection (sessionStorage or query param fallback)
  const hasSelectedTenant = () => {
    // Check sessionStorage first
    if (sessionStorage.getItem("tenant_selected") === "true") {
      return true;
    }
    // Fallback: check URL query param
    // NOTE: This is a convenience fallback for when sessionStorage is blocked.
    // It is not a security mechanism - it's purely to allow entry when storage fails.
    const params = new URLSearchParams(location.search);
    return params.get("tenant_selected") === "true";
  };

  // If admin has no tenant selected, redirect to admin landing
  useEffect(() => {
    if (isAdminUser && !hasSelectedTenant()) {
      navigate("/admin", { replace: true });
    }
    // ✅ FIX: Use location.search instead of entire location object
    // to avoid unnecessary re-renders
  }, [isAdminUser, navigate, location.search]);

  // Show loading or nothing while redirecting
  if (isAdminUser && !hasSelectedTenant()) {
    return null;
  }

  // Filter units based on selected tenant
  let filteredUnits = units;

  // BEHAVIOR:
  // - "All Tenants" (currentTenant === null) → show all 20 units (admin view)
  // - Specific Tenant (currentTenant has value) → show 6 units (user view)
  // - Regular user (userRole === "user") → show 6 units (user view)
  if (isAdminUser && currentTenant) {
    // Specific tenant selected → show 6 demo units (user view)
    filteredUnits = units.slice(0, 6);
  } else if (userRole === "user") {
    // Regular users see 6 units
    filteredUnits = units.slice(0, 6);
  }
  // If isAdminUser && !currentTenant → "All Tenants" → all units (no filtering)

  // Dynamic data calculations from filtered units
  const totalUnits = filteredUnits.length;
  const onlineUnits = filteredUnits.filter(
    (unit) => unit.status === "online",
  ).length;
  const offlineUnits = filteredUnits.filter(
    (unit) => unit.status === "offline",
  ).length;
  const maintenanceUnits = filteredUnits.filter(
    (unit) => unit.status === "maintenance",
  ).length;
  const unitsWithAlerts = filteredUnits.filter((unit) => unit.hasAlert).length;
  const alarmUnits = filteredUnits.filter((unit) => unit.hasAlarm).length;

  // Guard against division by zero
  const safePercentage = (value) => {
    return totalUnits ? Math.round((value / totalUnits) * 100) : 0;
  };

  const handleDialClick = (status) => {
    navigate(`/grid-view?status=${status}`);
  };

  const handleAlertsClick = () => {
    navigate("/alerts");
  };

  const handleAlarmsClick = () => {
    navigate("/grid-view?alarms=true");
  };

  const handleQuickAction = (action) => {
    if (action === "analytics") {
      navigate("/analytics");
    } else if (action === "health") {
      navigate("/system-health");
    } else if (action === "reports") {
      navigate("/reports");
    } else if (action === "settings") {
      navigate("/settings");
    }
  };

  const handleToggle = (view) => {
    setCurrentView(view);
  };

  // If performance view is selected, render the PerformanceDashboard
  if (currentView === "performance") {
    return (
      <div
        className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-3 lg:p-4 xl:p-6 ${className}`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Toggle above header */}
          <div className="mb-6">
            <HighTechToggle
              isPerformance={currentView === "performance"}
              onToggle={handleToggle}
              className="mb-6"
            />
          </div>

          {/* Performance Dashboard Content */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 lg:mb-6 gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Performance Dashboard
                </h1>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                  {isAdminUser && currentTenant
                    ? `Managing: ${currentTenant.name}`
                    : isAdminUser && !currentTenant
                    ? "Managing: All Tenants"
                    : "Monitor power generation, efficiency, and environmental impact"}
                </p>
              </div>
              {isAdminUser && (
                <div className="mt-4 md:mt-0">
                  <TenantSwitcher />
                </div>
              )}
            </div>

            {/* Breadcrumb */}
            <nav className="text-sm text-gray-600 dark:text-gray-400">
              <span className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                Home
              </span>
              <span className="mx-2">/</span>
              <span className="text-gray-900 dark:text-gray-100">
                Performance
              </span>
            </nav>
          </div>

          {/* Include the rest of PerformanceDashboard content without the header */}
          <PerformanceDashboard className="" hideHeader={true} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-3 lg:p-4 xl:p-6 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Toggle above header */}
        <div className="mb-6">
          <HighTechToggle
            isPerformance={currentView === "performance"}
            onToggle={handleToggle}
            className="mb-6"
          />
        </div>

        {/* Enhanced Header - Optimized for laptop screens */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 lg:mb-6 gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Dashboard Overview
              </h1>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                {isAdminUser && currentTenant
                  ? `Managing: ${currentTenant.name}`
                  : isAdminUser && !currentTenant
                  ? "Managing: All Tenants"
                  : `Welcome back, ${user?.firstName || user?.name || "User"}`}
              </p>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              {isAdminUser && <TenantSwitcher />}
              <NotificationBell />
            </div>
          </div>

          {/* Breadcrumb */}
          <nav className="text-sm text-gray-600 dark:text-gray-400">
            <span className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
              Home
            </span>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-gray-100">Dashboard</span>
          </nav>
        </div>

        {/* Mobile Unit Summary - Only visible on small screens */}
        <div className="md:hidden">
          <UnitSummary
            totalUnits={totalUnits}
            onlineCount={onlineUnits}
            offlineCount={offlineUnits}
            maintenanceCount={maintenanceUnits}
            alertCount={unitsWithAlerts}
            alarmCount={alarmUnits}
          />
        </div>

        {/* Status Overview - Enhanced Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <EnhancedStatusDial
            icon={Package}
            title="Total Units"
            count={totalUnits}
            percentage={100}
            color="blue"
            onClick={() => handleDialClick("all")}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={Wifi}
            title="Online"
            count={onlineUnits}
            percentage={safePercentage(onlineUnits)}
            color="green"
            onClick={() => handleDialClick("online")}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={WifiOff}
            title="Offline"
            count={offlineUnits}
            percentage={safePercentage(offlineUnits)}
            color="black"
            onClick={() => handleDialClick("offline")}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={Wrench}
            title="Maintenance"
            count={maintenanceUnits}
            percentage={safePercentage(maintenanceUnits)}
            color="yellow"
            onClick={() => handleDialClick("maintenance")}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={AlertTriangle}
            title="Alerts"
            count={unitsWithAlerts}
            percentage={safePercentage(unitsWithAlerts)}
            color="orange"
            onClick={handleAlertsClick}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={Zap}
            title="Alarms"
            count={alarmUnits}
            percentage={safePercentage(alarmUnits)}
            color="red"
            onClick={handleAlarmsClick}
            clickable={true}
            lastUpdated="live"
          />
        </div>

        {/* Quick Actions - Only show for Admin */}
        {isAdminUser && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <QuickActionCard
                icon={BarChart3}
                title="Sales Analytics"
                description="Detailed performance metrics and trends"
                onClick={() => handleQuickAction("analytics")}
                color="blue"
              />
              <QuickActionCard
                icon={Activity}
                title="System Health"
                description="Comprehensive system diagnostics"
                onClick={() => handleQuickAction("health")}
                color="green"
              />
              <QuickActionCard
                icon={FileText}
                title="Reports"
                description="Generate comprehensive PDF reports"
                onClick={() => handleQuickAction("reports")}
                color="purple"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
