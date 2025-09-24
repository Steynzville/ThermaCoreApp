import { useNavigate } from "react-router-dom";

const UnitStatusHeader = ({ unit, getStatusColor }) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate("/grid-view")}
        className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Grid View</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {unit.name} - Detailed View
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Serial Number: {unit.serialNumber} • {unit.location}
          </p>
          <div className="flex items-center space-x-2 mb-4">
            {unit.status === "online" ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            )}
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusColor(unit.status)}`}
            >
              {unit.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/remote-control", { state: { unit } })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="button-remote-control"
            >
              <span>Manage Remotely</span>
            </button>
            <button
              onClick={() => navigate(`/unit-performance/${unit.id}`, { state: { unit } })}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              data-testid="button-unit-performance"
            >
              <span>Unit Performance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitStatusHeader;
