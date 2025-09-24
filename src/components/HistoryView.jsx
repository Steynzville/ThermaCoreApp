import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import PageHeader from "./PageHeader";
import { getEventHistory } from "../services/unitService";
import { useAuth } from "../context/AuthContext";

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
    case "error":
      return "border-l-red-500 bg-red-50 dark:bg-red-900/20";
    case "warning":
      return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
    case "success":
      return "border-l-green-500 bg-green-50 dark:bg-green-900/20";
    case "info":
      return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20";
    default:
      return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20";
  }
};

const HistoryView = ({ className }) => {
  const { userRole } = useAuth();
  const [eventsToShow, setEventsToShow] = useState(5);
  const [eventHistory, setEventHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded notifications from the dashboard
  const getHardcodedNotifications = () => {
    const allNotifications = [
      {
        id: "notif-003-nh3",
        device: "ThermaCore Unit 003",
        timestamp: "2025-09-09 15:30",
        event: "NH3 LEAK DETECTED",
        value: "Unresolved",
        trend: "stable",
        severity: "error",
        type: "alarm"
      },
      {
        id: "notif-014-nh3", 
        device: "ThermaCore Unit 014",
        timestamp: "2025-09-09 15:15",
        event: "NH3 LEAK DETECTED",
        value: "Unresolved",
        trend: "stable",
        severity: "error",
        type: "alarm"
      },
      {
        id: "notif-001-offline",
        device: "ThermaCore Unit 001",
        timestamp: "2025-09-09 14:45",
        event: "Unit Offline",
        value: "Unresolved",
        trend: "stable",
        severity: "error",
        type: "alert"
      },
      {
        id: "notif-002-water",
        device: "ThermaCore Unit 002",
        timestamp: "2025-09-09 14:15",
        event: "Low Water Level",
        value: "Unresolved",
        trend: "stable",
        severity: "warning",
        type: "alert"
      },
      {
        id: "notif-003-maintenance",
        device: "ThermaCore Unit 003",
        timestamp: "2025-09-09 13:30",
        event: "Maintenance Scheduled",
        value: "Completed",
        trend: "stable",
        severity: "info",
        type: "alert"
      },
      {
        id: "notif-004-system",
        device: "ThermaCore Unit 004",
        timestamp: "2025-09-09 12:00",
        event: "System Restored",
        value: "Completed",
        trend: "stable",
        severity: "info",
        type: "alert"
      },
      {
        id: "notif-005-temp",
        device: "ThermaCore Unit 005",
        timestamp: "2025-09-09 11:30",
        event: "Temperature Alert",
        value: "Completed",
        trend: "stable",
        severity: "info",
        type: "alert"
      },
      {
        id: "notif-006-pressure",
        device: "ThermaCore Unit 006",
        timestamp: "2025-09-09 10:15",
        event: "Pressure Drop",
        value: "Unresolved",
        trend: "stable",
        severity: "error",
        type: "alert"
      }
    ];

    // Filter out 014 NH3 leak for user role
    if (userRole === "user") {
      return allNotifications.filter(notif => notif.id !== "notif-014-nh3");
    }
    
    return allNotifications;
  };

  useEffect(() => {
    const loadEventHistory = async () => {
      try {
        const events = await getEventHistory();
        setEventHistory(events);
      } catch (error) {
        console.error("Error loading event history:", error);
        setEventHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadEventHistory();
  }, []);

  const handleLoadMore = () => {
    setEventsToShow((prev) => prev + 5);
  };

  // Format mock event history for display
  const formatEventForDisplay = (event) => {
    const date = new Date(event.timestamp);
    const formattedDate = date.toLocaleString();

    // Determine severity and trend based on description
    let severity = "info";
    let trend = "stable";

    if (event.description.toLowerCase().includes("maintenance")) {
      severity = "success";
      trend = "up";
    } else if (event.description.toLowerCase().includes("diagnostic")) {
      severity = "info";
      trend = "stable";
    } else if (event.description.toLowerCase().includes("calibration")) {
      severity = "warning";
      trend = "up";
    }

    return {
      id: event.id,
      device: event.unitName,
      timestamp: formattedDate,
      event: event.description,
      value: "Completed",
      trend,
      severity,
    };
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
      >
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Event History"
            subtitle="Loading event history..."
          />
        </div>
      </div>
    );
  }

  const formattedEvents = eventHistory.map(formatEventForDisplay);
  const hardcodedNotifications = getHardcodedNotifications();
  
  // Combine notifications and events, with notifications at the top
  const allItems = [...hardcodedNotifications, ...formattedEvents];

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Event History"
          subtitle="Recent events and changes across all devices"
        />

        <div className="space-y-4">
          {allItems.slice(0, eventsToShow + hardcodedNotifications.length).map((event) => (
            <Card
              key={event.id}
              className={`bg-white dark:bg-gray-900 border-l-4 ${getSeverityColor(event.severity)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {event.device}
                      </h3>
                      {getTrendIcon(event.trend)}
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      {event.event}
                    </p>

                    <p className={`text-sm font-medium ${
                      event.value === "Unresolved" 
                        ? "text-red-600 dark:text-red-400" 
                        : event.value === "Completed" && event.severity === "info"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}>
                      {event.value}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{event.timestamp}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {eventsToShow + hardcodedNotifications.length < allItems.length && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Load more Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
