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
import { useNavigate } from "react-router-dom";

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
  const { user, userRole } = useAuth();
  const { currentTenant, isAdmin } = useTenant();
  const [currentView, setCurrentView] = useState("operator"); // "operator" or "performance"

  // If admin has no tenant selected, redirect to admin landing
  useEffect(() => {
    // isAdmin is from TenantContext, userRole from AuthContext
    const adminCheck = userRole === "admin" || user?.role === "admin";
    // Only redirect if admin and no tenant selected (null means "All Tenants" is selected, which is valid)
    // We need a way to know if the user has explicitly selected "All Tenants" vs. no selection yet
    // Since currentTenant is null for both "All Tenants" and no selection,
    // we need to use a different indicator - we'll use a flag in TenantContext or localStorage
    // For now, we'll check if availableTenants is populated (admin logged in)
    // and if currentTenant is null, we treat it as "All Tenants" selected
    // The admin landing page ensures selection before navigating here
    // So if we're on dashboard and admin with no tenant, redirect to admin
    // But if "All Tenants" is selected, currentTenant is null and we should NOT redirect
    // We'll use a session flag to track if admin has made a selection
    
    // Check sessionStorage for tenant selection flag
    const hasSelectedTenant = sessionStorage.getItem("tenant_selected") === "true";
    
    if (adminCheck && !hasSelectedTenant) {
      // If no selection has been made yet, redirect to admin landing
      navigate("/admin", { replace: true });
    }
  }, [userRole, user, currentTenant, navigate]);

  // Show loading or nothing while redirecting
  if (userRole === "admin" && sessionStorage.getItem("tenant_selected") !== "true") {
    return null;
  }

  // Filter units based on selected tenant
  let filteredUnits = units;
  
  // If admin and a specific tenant is selected (not "All Tenants")
  if (isAdmin && currentTenant) {
    // Filter units by client name matching the selected tenant
    filteredUnits = units.filter((unit) => unit.client?.name === currentTenant.name);
  } else if (userRole === "user") {
    // Regular users see first 6 units
    filteredUnits = units.slice(0, 6);
  }

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
                  {isAdmin && currentTenant
                    ? `Managing: ${currentTenant.name}`
                    : isAdmin && !currentTenant
                    ? "Managing: All Tenants"
                    : "Monitor power generation, efficiency, and environmental impact"}
                </p>
              </div>
              {isAdmin && (
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
                {isAdmin && currentTenant
                  ? `Managing: ${currentTenant.name}`
                  : isAdmin && !currentTenant
                  ? "Managing: All Tenants"
                  : `Welcome back, ${user?.firstName || user?.name || "User"}`}
              </p>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              {isAdmin && <TenantSwitcher />}
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
            // Intentional hardcoded value
            alertCount={6}
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
        {isAdmin && (
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
