
const UnitClientTab = ({
  unit,
  handleSendEmail,
  handleCallClient,
  handleScheduleMaintenance,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Client Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Company
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {unit.client?.name || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Contact Person
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {unit.client?.contact || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Email
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {unit.client?.email || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Phone
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {unit.client?.phone || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Quick Actions
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => handleSendEmail(unit.client?.email)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors button-hover"
          >
            Send Email
          </button>
          <button
            onClick={() => handleCallClient(unit.client?.phone)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors button-hover"
          >
            Call Client
          </button>
          <button
            onClick={() => handleScheduleMaintenance()}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors button-hover"
          >
            Schedule Maintenance
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnitClientTab;
