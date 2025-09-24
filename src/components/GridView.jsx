

import { useEffect, useMemo,useState } from "react";
import { useLocation,useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";

const GridView = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const { units: contextUnits, loading } = useUnits();

  const [localUnits, setLocalUnits] = useState([]);

  // Static alert data (moved outside useEffect to avoid recreation)
  const alertsData = useMemo(() => ({
    "TC001": {
      type: "critical",
      title: "Unit Offline",
      message: "ThermaCore Unit 001 has gone offline and requires immediate attention",
      timestamp: "2025-09-09 14:45",
      acknowledged: false,
    },
    "TC002": {
      type: "warning",
      title: "Low Water Level",
      message: "ThermaCore Unit 002 water level has dropped below 10%",
      timestamp: "2025-09-09 14:15",
      acknowledged: false,
    },
    "TC003": {
      type: "info",
      title: "Maintenance Scheduled",
      message: "ThermaCore Unit 003 scheduled for routine maintenance tomorrow",
      timestamp: "2025-09-09 13:30",
      acknowledged: true,
    },
    "TC004": {
      type: "success",
      title: "System Restored",
      message: "ThermaCore Unit 004 has been successfully restored to normal operation",
      timestamp: "2025-09-09 12:00",
      acknowledged: true,
    },
    "TC005": {
      type: "warning",
      title: "Temperature Alert",
      message: "ThermaCore Unit 005 temperature has exceeded normal operating range",
      timestamp: "2025-09-09 11:30",
      acknowledged: false,
    },
    "TC006": {
      type: "critical",
      title: "Pressure Drop",
      message: "ThermaCore Unit 006 experiencing significant pressure drop",
      timestamp: "2025-09-09 10:15",
      acknowledged: false,
    },
  }), []);

  // Memoized processed units to avoid expensive operations on every render
  const processedUnits = useMemo(() => {
    if (!contextUnits) return [];
    
    const mappedUnits = contextUnits.map((unit) => ({
      ...unit,
      serialNumber: unit.serialNumber || `TC-2024-${unit.id}`,
      powerOutput: unit.currentPower,
      alerts: unit.hasAlert ? ["System alert detected"] : [],
      currentAlert: unit.hasAlert && alertsData[unit.id] ? alertsData[unit.id] : null,
      // Use static dates instead of random generation
      installDate: `2024-0${(parseInt(unit.id.slice(-1)) % 9) + 1}-15`,
      lastMaintenance: `2024-0${(parseInt(unit.id.slice(-1)) % 9) + 2}-10`,
    }));

    return userRole === "admin" ? mappedUnits : mappedUnits.slice(0, 6);
  }, [contextUnits, userRole, alertsData]);

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
      <div className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-3 lg:p-4 xl:p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">Loading grid view...</div>
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
          title={`Grid View - ${statusFilter === "All Status" ? "All Units" : statusFilter}`}
          subtitle="Complete overview of all ThermaCore units"
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
                  {/* Icons row - Power and Water side by side */}
                  <div className="flex items-center space-x-3 mb-3">
                    {/* Power Icon */}
                    <PowerIcon3D power={unit.currentPower} />
                    
                    {/* Water Icon - only show if unit has water generation */}
                    {unit.watergeneration && (
                      <WaterIcon3D waterLevel={unit.water_level} greyedOut={unit.status !== "online" || !unit.watergeneration} />
                    )}
                  </div>
                  
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
