
const HighTechToggle = ({ isPerformance, onToggle, className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative bg-white dark:bg-gray-900 rounded-xl p-1 shadow-lg border-2 border-blue-900 dark:border-yellow-600 backdrop-blur-sm shadow-[0_0_20px_rgba(30,58,138,0.8)] dark:shadow-[0_0_20px_rgba(202,138,4,0.8)] ring-4 ring-blue-900/30 dark:ring-yellow-600/30">
        {/* Sliding indicator */}
        <div
          className={`absolute top-1 bottom-1 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md transition-all duration-300 ease-in-out border border-gray-300 dark:border-gray-600 ${
            isPerformance ? "left-[calc(50%+0.125rem)]" : "left-1"
          }`}
        />

        {/* Toggle container */}
        <div className="relative flex items-center">
          {/* Overview option */}
          <button
            onClick={() => onToggle("operator")}
            className={`relative flex items-center justify-center px-4 py-2.5 w-24 rounded-lg transition-all duration-300 z-10 ${
              !isPerformance
                ? "text-gray-900 dark:text-gray-100 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="text-xs font-medium">Overview</span>
          </button>

          {/* Analytics option */}
          <button
            onClick={() => onToggle("performance")}
            className={`relative flex items-center justify-center px-4 py-2.5 w-24 rounded-lg transition-all duration-300 z-10 ${
              isPerformance
                ? "text-gray-900 dark:text-gray-100 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="text-xs font-medium">Analytics</span>
          </button>
        </div>

        {/* Subtle accent line */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60"></div>
      </div>
    </div>
  );
};

export default HighTechToggle;
