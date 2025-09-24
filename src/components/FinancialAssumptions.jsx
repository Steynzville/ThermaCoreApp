import { useEffect,useState } from "react";

const FinancialAssumptions = ({
  isOpen,
  onClose,
  onSave,
  currentAssumptions,
}) => {
  const [assumptions, setAssumptions] = useState({
    electricityCost: 0.4, // Cost per kWh
    rebate: 0.05, // Rebate per kWh
    feedInTariff: 0.08, // Feed-in tariff per kWh
  });

  // Update local state when currentAssumptions prop changes or modal opens
  useEffect(() => {
    if (isOpen && currentAssumptions) {
      setAssumptions(currentAssumptions);
    }
  }, [isOpen, currentAssumptions]);

  const handleInputChange = (field, value) => {
    setAssumptions((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleSave = () => {
    onSave(assumptions);
    onClose();
  };

  const handleCancel = () => {
    // Reset to current saved assumptions
    if (currentAssumptions) {
      setAssumptions(currentAssumptions);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Financial Impact Assumptions
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cost of electricity per kWh ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={assumptions.electricityCost}
              onChange={(e) =>
                handleInputChange("electricityCost", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rebate per month ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={assumptions.rebate}
              onChange={(e) => handleInputChange("rebate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.05"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Feed-in tariff per kWh ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={assumptions.feedInTariff}
              onChange={(e) =>
                handleInputChange("feedInTariff", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.08"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialAssumptions;
