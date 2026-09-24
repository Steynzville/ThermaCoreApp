import { AlertTriangle, CheckCircle, Filter, User, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";
import PageHeader from "./PageHeader";
import OutputIndicators from "./OutputIndicators";
import SearchBar from "./SearchBar";
import { Card, CardContent, CardHeader } from "./ui/card";

/**
 * Get the page title based on user role and status filter
 */
const getGridViewTitle = (userRole, statusFilter) => {
  const baseTitle = userRole === "admin" ? "Grid View" : "My Units";
  const filterText = statusFilter === "All Status" ? "All Units" : statusFilter;
  return `${baseTitle} - ${filterText}`;
};

/**
 * Get the page subtitle based on user role
 */
const getGridViewSubtitle = (userRole) => {
  return userRole === "admin"
    ? "Complete overview of all ThermaCore units"
    : "Your assigned ThermaCore units";
};

const GridView = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, permissions } = useAuth();
  const { units: contextUnits, loading } = useUnits();

  const [localUnits, setLocalUnits] = useState([]);

  // Memoized processed units to avoid expensive operations on every render
  const processedUnits = useMemo(() => {
    if (!contextUnits) return [];

    const mappedUnits = contextUnits.map((unit) => ({
      ...unit,
      serialNumber: unit.serialNumber || `TC-2024-${unit.id}`,
      powerOutput: unit.currentPower,
      alerts: unit.alerts || [],
      currentAlert: unit.alerts?.[0] || null,
      installDate: unit.installDate,
      lastMaintenance: unit.lastMaintenance,
    }));

    // Admins can see all units, others see limited units
    return mappedUnits;
  }, [contextUnits]);

  useEffect(() => {
    setLocalUnits(processedUnits);
  }, [processedUnits]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (term) => {
    setSearchTerm(term);
  };
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [unitsToShow, setUnitsToShow] = useState(5);

  // Handle URL parameters for filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const status = urlParams.get("status");
    const alerts = urlParams.get("alerts");
    const alarms = urlParams.get("alarms");
    const search = urlParams.get("search");

    if (status) {
      if (status === "all") {
        setStatusFilter("All Status");
      } else {
        setStatusFilter(status.charAt(0).toUpperCase() + status.slice(1));
      }
    }

    if (alerts === "true") {
      setStatusFilter("Alerts");
    }

    if (alarms === "true") {
      setStatusFilter("Alarms");
    }

    // Set search term from URL parameter
    if (search) {
      setSearchTerm(decodeURIComponent(search));
    }
  }, [location.search]);

  const filteredUnits = localUnits.filter((unit) => {
    const matchesSearch =
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.client.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All Status" ||
      unit.status.toLowerCase() === statusFilter.toLowerCase() ||
      (statusFilter === "Alerts" && unit.alerts.length > 0) ||
      (statusFilter === "Alarms" && unit.hasAlarm);

    return matchesSearch && matchesStatus;
  });

  const handleUnitClick = (unit) => {
    if (userRole === "admin") {
      navigate(`/unit-details/${unit.id}`, { state: { unit } });
    } else {
      navigate(`/unit/${unit.id}`, { state: { unit } });
    }
  };

  const handleLoadMore = () => {
    setUnitsToShow((prev) => prev + 5);
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-3 lg:p-4 xl:p-6 ${className}`}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">
            Loading grid view...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-3 lg:p-4 xl:p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title={getGridViewTitle(userRole, statusFilter)}
          subtitle={getGridViewSubtitle(userRole)}
        />

        {/* Search and Filter Controls - Optimized for laptop screens */}
        <div className="flex flex-col md:flex-row gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="flex-1">
            <SearchBar
              placeholder="Search by unit name, serial number, client, or location..."
              value={searchTerm}
              onSearch={handleSearch}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option>All Status</option>
              <option>Online</option>
              <option>Offline</option>
              <option>Maintenance</option>
              <option>Alerts</option>
              <option>Alarms</option>
            </select>
          </div>
        </div>

        {/* Units Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredUnits.slice(0, unitsToShow).map((unit) => (
            <Card
              key={unit.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow grid-unit-hover relative"
              onClick={() => handleUnitClick(unit)}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col items-center">
                  <OutputIndicators unit={unit} />

                  {/* Unit name below icons */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
                    {unit.name}
                  </h3>

                  {/* Status indicator */}
                  <div className="flex items-center space-x-2">
                    {unit.status === "online" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : unit.status === "maintenance" ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        unit.status === "online"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : unit.status === "maintenance"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {unit.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  S/N: {unit.serialNumber}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📍 {unit.location}
                </p>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {unit.client.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {unit.client.contact}
                    </p>
                  </div>
                </div>

                {unit.hasAlarm && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <div className="flex items-center space-x-1">
                      <Zap className="h-3 w-3 text-red-600 dark:text-red-400" />
                      <p className="text-xs font-medium text-red-800 dark:text-red-200">
                        Alarm!
                      </p>
                    </div>
                  </div>
                )}

                {unit.alerts.length > 0 && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                        {unit.alerts.length} Alert
                        {unit.alerts.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Click for detailed view
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {unitsToShow < filteredUnits.length && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Load more Units
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridView;
