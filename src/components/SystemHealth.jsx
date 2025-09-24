import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Globe,
  Server,
  XCircle,
} from "lucide-react";

const iconMap = {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Database,
  Globe,
  Cpu,
};

import systemHealthData from "../data/systemHealthData";

const COLORS = {
  Operational: "#28a745",
  "Degraded Performance": "#ffc107",
  Outage: "#dc3545",
};

const StatusIndicator = ({ status }) => (
  <span
    style={{
      height: "15px",
      width: "15px",
      backgroundColor: COLORS[status] || "#6c757d",
      borderRadius: "50%",
      display: "inline-block",
      marginRight: "10px",
    }}
  ></span>
);

const getStatusIcon = (status) => {
  switch (status) {
    case "Operational":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "Degraded Performance":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "Outage":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
};

const SystemHealth = ({ className }) => {
  const operationalCount = systemHealthData.filter(
    (service) => service.status === "Operational",
  ).length;
  const degradedCount = systemHealthData.filter(
    (service) => service.status === "Degraded Performance",
  ).length;
  const outageCount = systemHealthData.filter(
    (service) => service.status === "Outage",
  ).length;

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="System Health Status"
          subtitle="Real-time monitoring of all system components"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Operational
                  </h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {operationalCount}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Degraded
                  </h3>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {degradedCount}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Outages
                  </h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {outageCount}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* System Health Table */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Service Status Overview
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current status of all system services
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Service
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Provider
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Response Time
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {systemHealthData.map((service, index) => {
                    const IconComponent = iconMap[service.icon];
                    return (
                      <tr
                        key={service.name}
                        className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? "bg-gray-50 dark:bg-gray-900/50" : ""}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                              <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {service.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-900 dark:text-gray-100">
                            {service.provider}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <StatusIndicator status={service.status} />
                            {getStatusIcon(service.status)}
                            <span
                              className={`font-medium ${
                                service.status === "Operational"
                                  ? "text-green-600 dark:text-green-400"
                                  : service.status === "Degraded Performance"
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {service.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`font-mono text-sm ${
                              service.responseTime === "N/A"
                                ? "text-gray-500 dark:text-gray-400"
                                : parseInt(service.responseTime) > 200
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {service.responseTime}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Additional System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                System Uptime
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Overall system availability
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  99.8%
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last 30 days
                </p>
                <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: "99.8%" }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Average Response Time
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Across all services
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  125ms
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last 24 hours
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ↓ 15ms from yesterday
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
