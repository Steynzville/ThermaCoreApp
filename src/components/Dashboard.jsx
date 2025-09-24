import React, { useState } from "react";
import {
  Package,
  Wifi,
  WifiOff,
  Wrench,
  AlertTriangle,
  Zap,
  BarChart3,
  Activity,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { units } from "../data/mockUnits";
import EnhancedStatusDial from "./Dashboard/EnhancedStatusDial";
import QuickActionCard from "./Dashboard/QuickActionCard";
import UnitSummary from "./Dashboard/UnitSummary";
import PerformanceDashboard from "./PerformanceDashboard";
import HighTechToggle from "./ui/HighTechToggle";
import NotificationBell from "./NotificationBell";

// Enhanced Dashboard Component
const Dashboard = ({ className }) => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState("operator"); // "operator" or "performance"

  // Filter units based on user role - User role only sees first 5 units
  const filteredUnits = userRole === "user" ? units.slice(0, 6) : units;

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

  // For alarms, we'll use hasAlarm property
  const alarmUnits = filteredUnits.filter((unit) => unit.hasAlarm).length;

  // Count alerts from AlertsView - should match the actual alerts displayed
  const alertCount = unitsWithAlerts; // Dynamic count based on units with alerts

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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 lg:mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Performance Dashboard
                </h1>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                  Monitor power generation, efficiency, and environmental impact
                </p>
              </div>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 lg:mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Dashboard Overview
              </h1>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                Monitor your ThermaCore units in real-time
              </p>
            </div>
            <NotificationBell className="mt-4 md:mt-0" />
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
            percentage={Math.round((onlineUnits / totalUnits) * 100)}
            color="green"
            onClick={() => handleDialClick("online")}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={WifiOff}
            title="Offline"
            count={offlineUnits}
            percentage={Math.round((offlineUnits / totalUnits) * 100)}
            color="black"
            onClick={() => handleDialClick("offline")}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={Wrench}
            title="Maintenance"
            count={maintenanceUnits}
            percentage={Math.round((maintenanceUnits / totalUnits) * 100)}
            color="yellow"
            onClick={() => handleDialClick("maintenance")}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={AlertTriangle}
            title="Alerts"
            count={unitsWithAlerts}
            percentage={Math.round((unitsWithAlerts / totalUnits) * 100)}
            color="orange"
            onClick={handleAlertsClick}
            clickable={true}
            lastUpdated="live"
          />

          <EnhancedStatusDial
            icon={Zap}
            title="Alarms"
            count={alarmUnits}
            percentage={Math.round((alarmUnits / totalUnits) * 100)}
            color="red"
            onClick={handleAlarmsClick}
            clickable={true}
            lastUpdated="live"
          />
        </div>

        {/* Quick Actions - Only show for Admin */}
        {userRole === "admin" && (
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
