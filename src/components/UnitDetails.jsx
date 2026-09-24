import MaintenanceScheduler from "./unit-details/MaintenanceScheduler";
import { useUnits } from "../context/UnitContext";
import { useState } from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
  useParams,
} from "react-router-dom";

import RemoteControl from "./RemoteControl";
import UnitAlertsTab from "./unit-details/UnitAlertsTab";
import UnitClientTab from "./unit-details/UnitClientTab";
import UnitHistoryTab from "./unit-details/UnitHistoryTab";
import UnitOverviewTab from "./unit-details/UnitOverviewTab";
// Import subcomponents
import UnitStatusHeader from "./unit-details/UnitStatusHeader";
import UnitTabNavigation from "./unit-details/UnitTabNavigation";

const UnitDetails = ({ className }) => {
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const { getUnit, loading } = useUnits();
  const unit = getUnit(id);
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  const alertsHistory = unit?.alerts || [];

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

  const handleScheduleMaintenance = () => setMaintenanceOpen(true);

  if (loading)
    return (
      <p role="status" className="p-6">
        Loading unit...
      </p>
    );
  if (!unit) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Unit Not Found
          </h1>
          <button
            type="button"
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
        {maintenanceOpen && (
          <MaintenanceScheduler
            key={unit.id}
            unit={unit}
            onClose={() => setMaintenanceOpen(false)}
          />
        )}
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
          <RemoteControl unit={unit} />
        )}
      </div>
    </div>
  );
};

export default UnitDetails;
