import { Minus,TrendingDown, TrendingUp } from "lucide-react";
import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import RemoteControl from "./RemoteControl";
import UnitAlertsTab from "./unit-details/UnitAlertsTab";
import UnitClientTab from "./unit-details/UnitClientTab";
import UnitHistoryTab from "./unit-details/UnitHistoryTab";
import UnitOverviewTab from "./unit-details/UnitOverviewTab";
// Import subcomponents
import UnitStatusHeader from "./unit-details/UnitStatusHeader";
import UnitTabNavigation from "./unit-details/UnitTabNavigation";

const UnitDetails = ({ className }) => {
  const { formatTemperature } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const unit = location.state?.unit;
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Extend unit data with mock battery life and tank capacity
  if (unit) {
    unit.batteryLife = 85; // Example battery life percentage
    unit.tankCapacity = 800; // Example tank capacity in liters
  }

  // Mock historical data for the unit
  const historicalData = [
    {
      id: 1,
      timestamp: "2024-08-07 14:30",
      event: "Power output increased",
      value: `${unit?.powerOutput} kW`,
      trend: "up",
      severity: "info",
    },
    {
      id: 2,
      timestamp: "2024-08-07 12:15",
      event: "Water level normal",
      value: `${unit?.waterLevel}%`,
      trend: "stable",
      severity: "info",
    },
    {
      id: 3,
      timestamp: "2024-08-07 10:45",
      event: "Temperature stabilized",
      value: `${formatTemperature(unit?.temperature)}`,
      trend: "stable",
      severity: "info",
    },
    {
      id: 4,
      timestamp: "2024-08-06 16:00",
      event: "Maintenance completed",
      value: "System restored",
      trend: "up",
      severity: "success",
    },
    {
      id: 5,
      timestamp: "2024-08-06 09:30",
      event: "Scheduled maintenance started",
      value: "System offline",
      trend: "down",
      severity: "warning",
    },
  ];

  const alertsHistory = [
    {
      id: 1,
      timestamp: "2024-08-05 14:45",
      type: "warning",
      title: "Low Water Level",
      message: "Water level dropped below 80%",
      resolved: true,
      resolvedAt: "2024-08-05 15:30",
    },
    {
      id: 2,
      timestamp: "2024-07-28 11:20",
      type: "info",
      title: "Maintenance Reminder",
      message: "Scheduled maintenance due in 7 days",
      resolved: true,
      resolvedAt: "2024-08-06 09:30",
    },
    {
      id: 3,
      timestamp: "2024-07-15 08:15",
      type: "critical",
      title: "High Temperature Alert",
      message: "Temperature exceeded safe operating limits",
      resolved: true,
      resolvedAt: "2024-07-15 09:45",
    },
  ];

  // Helper functions
  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "border-l-red-500 bg-red-50 dark:bg-red-900/20";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-900/20";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20";
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "offline":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "decommissioned":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const handleSendEmail = (email) => {
    if (email) {
      if (
        window.confirm(
          `Do you want to open Outlook to send an email to ${email}?`,
        )
      ) {
        window.location.href = `mailto:${email}`;
      }
    } else {
      alert("Client email address not available.");
    }
  };

  const handleCallClient = (phone) => {
    if (phone) {
      if (window.confirm(`Do you want to call ${phone}?`)) {
        window.location.href = `tel:${phone}`;
      }
    } else {
      alert("Client phone number not available.");
    }
  };

  const handleScheduleMaintenance = () => {
    if (
      window.confirm(
        "Do you want to open your calendar to schedule maintenance?",
      )
    ) {
      // This is a placeholder. In a real app, you might integrate with a calendar API.
      alert("Opening calendar application (placeholder action).");
    }
  };

  if (!unit) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Unit Not Found
          </h1>
          <button
            onClick={() => navigate("/grid-view")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Grid View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <UnitStatusHeader unit={unit} getStatusColor={getStatusColor} />

        {/* Tab Navigation */}
        <UnitTabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Content */}
        {activeTab === "overview" && <UnitOverviewTab unit={unit} />}

        {activeTab === "history" && <UnitHistoryTab unit={unit} />}

        {activeTab === "alerts" && (
          <UnitAlertsTab
            unit={unit}
            alertsHistory={alertsHistory}
            getAlertTypeColor={getAlertTypeColor}
          />
        )}

        {activeTab === "client" && (
          <UnitClientTab
            unit={unit}
            handleSendEmail={handleSendEmail}
            handleCallClient={handleCallClient}
            handleScheduleMaintenance={handleScheduleMaintenance}
          />
        )}

        {activeTab === "remote-control" && unit && (
          <RemoteControl
            unit={{
              ...unit,
              waterProductionOn: unit.watergeneration,
              autoSwitchEnabled: true,
            }}
            details={{
              controls: {
                machinePower: true,
                waterProduction: true,
                automaticControl: true,
              },
            }}
          />
        )}
      </div>
    </div>
  );
};

export default UnitDetails;
