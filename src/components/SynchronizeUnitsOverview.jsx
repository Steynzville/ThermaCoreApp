import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Database,
  Download,
  RefreshCw,
  Settings,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import React, { useEffect,useState } from "react";
import { useNavigate } from "react-router-dom";

import { units } from "../data/mockUnits";
import { Card, CardContent,CardHeader } from "./ui/card";

const SynchronizeUnitsOverview = ({ className }) => {
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, success, error
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [unitSyncStates, setUnitSyncStates] = useState({});
  const [selectedUnits, setSelectedUnits] = useState(new Set());

  useEffect(() => {
    // Initialize unit sync states based on mock data
    const initialStates = {};
    units.forEach((unit) => {
      // Use unit properties from mock data to determine sync status
      let syncStatus = "pending";
      if (unit.status === "online" && !unit.hasAlert) {
        syncStatus = "synced";
      } else if (unit.status === "online" && unit.hasAlert) {
        syncStatus = "error";
      } else if (unit.status === "offline") {
        syncStatus = "pending";
      }

      initialStates[unit.id] = {
        status: syncStatus,
        lastSync:
          unit.status === "online"
            ? new Date(Date.now() - Math.random() * 86400000).toISOString()
            : null, // Random time within last 24h for online units
        dataSize: Math.floor(Math.random() * 500) + 100, // Mock data size in KB
        healthStatus: unit.healthStatus,
        hasAlert: unit.hasAlert,
      };
    });
    setUnitSyncStates(initialStates);

    // Set last sync time
    setLastSyncTime(new Date().toISOString());
  }, []); // Remove unnecessary dependency as 'units' is from outer scope

  const handleSyncAll = async () => {
    setSyncStatus("syncing");

    // Simulate sync process
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate delay

      setUnitSyncStates((prev) => ({
        ...prev,
        [unit.id]: {
          ...prev[unit.id],
          status: "syncing",
        },
      }));
    }

    // Complete sync based on unit properties from mock data
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const finalStates = {};
    units.forEach((unit) => {
      let finalStatus = "synced";
      if (unit.status === "offline") {
        finalStatus = "error";
      } else if (unit.hasAlert) {
        finalStatus = "error";
      } else if (unit.healthStatus === "Critical") {
        finalStatus = "error";
      }

      finalStates[unit.id] = {
        status: finalStatus,
        lastSync:
          finalStatus === "synced"
            ? new Date().toISOString()
            : unitSyncStates[unit.id]?.lastSync,
        dataSize: Math.floor(Math.random() * 500) + 100,
        healthStatus: unit.healthStatus,
        hasAlert: unit.hasAlert,
      };
    });

    setUnitSyncStates(finalStates);
    setSyncStatus("success");
    setLastSyncTime(new Date().toISOString());
  };

  const handleSyncSelected = async () => {
    if (selectedUnits.size === 0) return;

    setSyncStatus("syncing");

    for (const unitId of selectedUnits) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      setUnitSyncStates((prev) => ({
        ...prev,
        [unitId]: {
          ...prev[unitId],
          status: "syncing",
        },
      }));
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const updatedStates = { ...unitSyncStates };
    selectedUnits.forEach((unitId) => {
      const unit = units.find((u) => u.id === unitId);
      let finalStatus = "synced";
      if (unit?.status === "offline") {
        finalStatus = "error";
      } else if (unit?.hasAlert) {
        finalStatus = "error";
      } else if (unit?.healthStatus === "Critical") {
        finalStatus = "error";
      }

      updatedStates[unitId] = {
        status: finalStatus,
        lastSync:
          finalStatus === "synced"
            ? new Date().toISOString()
            : updatedStates[unitId]?.lastSync,
        dataSize: Math.floor(Math.random() * 500) + 100,
        healthStatus: unit?.healthStatus,
        hasAlert: unit?.hasAlert,
      };
    });

    setUnitSyncStates(updatedStates);
    setSyncStatus("success");
    setSelectedUnits(new Set());
  };

  const toggleUnitSelection = (unitId) => {
    const newSelection = new Set(selectedUnits);
    if (newSelection.has(unitId)) {
      newSelection.delete(unitId);
    } else {
      newSelection.add(unitId);
    }
    setSelectedUnits(newSelection);
  };

  const selectAllUnits = () => {
    setSelectedUnits(new Set(units.map((unit) => unit.id)));
  };

  const clearSelection = () => {
    setSelectedUnits(new Set());
  };

  const getSyncStatusIcon = (status) => {
    switch (status) {
      case "synced":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "syncing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSyncStatusText = (status) => {
    switch (status) {
      case "synced":
        return "Synchronized";
      case "syncing":
        return "Synchronizing...";
      case "error":
        return "Sync Failed";
      case "pending":
        return "Pending Sync";
      default:
        return "Unknown";
    }
  };

  const getConnectionIcon = (unitStatus) => {
    return unitStatus === "online" ? (
      <Wifi className="h-4 w-4 text-green-500" />
    ) : (
      <WifiOff className="h-4 w-4 text-red-500" />
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const formatDataSize = (sizeKB) => {
    if (sizeKB < 1024) return `${sizeKB} KB`;
    return `${(sizeKB / 1024).toFixed(1)} MB`;
  };

  const syncedCount = Object.values(unitSyncStates).filter(
    (state) => state.status === "synced",
  ).length;
  const errorCount = Object.values(unitSyncStates).filter(
    (state) => state.status === "error",
  ).length;
  const pendingCount = Object.values(unitSyncStates).filter(
    (state) => state.status === "pending",
  ).length;

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Synchronize Units Overview
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage data synchronization across all ThermaCore units
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Settings className="h-4 w-4" />
                <span>Sync Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sync Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Units
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {units.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Synchronized
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {syncedCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {pendingCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Errors
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {errorCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Controls */}
        <Card className="bg-white dark:bg-gray-900 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Synchronization Controls
              </h3>
              {lastSyncTime && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last sync: {formatDateTime(lastSyncTime)}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSyncAll}
                  disabled={syncStatus === "syncing"}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncStatus === "syncing" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Sync All Units</span>
                </button>

                <button
                  onClick={handleSyncSelected}
                  disabled={
                    syncStatus === "syncing" || selectedUnits.size === 0
                  }
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  <span>Sync Selected ({selectedUnits.size})</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllUnits}
                  className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>

            {syncStatus === "syncing" && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                  <p className="text-blue-800 dark:text-blue-200">
                    Synchronization in progress... Please wait.
                  </p>
                </div>
              </div>
            )}

            {syncStatus === "success" && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-800 dark:text-green-200">
                    Synchronization completed successfully!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Units List */}
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Unit Synchronization Status
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {units.map((unit) => {
                const syncState = unitSyncStates[unit.id] || {
                  status: "pending",
                  lastSync: null,
                  dataSize: 0,
                };
                const isSelected = selectedUnits.has(unit.id);

                return (
                  <div
                    key={unit.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUnitSelection(unit.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />

                      <div className="flex items-center space-x-3">
                        {getConnectionIcon(unit.status)}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {unit.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {unit.location} • {unit.client}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Data Size
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatDataSize(syncState.dataSize)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last Sync
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatDateTime(syncState.lastSync)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 min-w-[120px]">
                        {getSyncStatusIcon(syncState.status)}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getSyncStatusText(syncState.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SynchronizeUnitsOverview;
