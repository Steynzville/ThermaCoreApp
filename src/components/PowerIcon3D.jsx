const PowerIcon3D = ({ power = 0, className = "" }) => {
  // Normalize input: undefined -> 0, strings -> Number, keep null as-is
  const normalizedPower = power === undefined ? 0 : power;
  const numericPower = typeof normalizedPower === "string" 
    ? parseFloat(normalizedPower) 
    : normalizedPower;
  
  // Online = truthy numeric value (excludes 0, null, NaN, undefined)
  // String "0" becomes 0 -> offline, string "5" becomes 5 -> online
  const isOnline = Boolean(numericPower) && !isNaN(numericPower);

  const getPowerColor = (on) =>
    on ? "text-green-500 dark:text-green-400" : "text-gray-400 dark:text-gray-600";

  const getBgColor = (on) =>
    on ? "bg-green-50 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-800";

  const getBorderColor = (on) =>
    on ? "border-green-700 dark:border-lime-400" : "border-gray-200 dark:border-gray-700";

  // Display value: null -> "null", NaN -> "0", otherwise show the value
  const displayValue = () => {
    if (numericPower === null || numericPower === undefined) return "null";
    if (isNaN(numericPower)) return "0";
    return numericPower;
  };

  return (
    <div className={`relative ${className}`}>
      {/* 3D Container with perspective - ensuring perfect square aspect ratio */}
      <div className="relative transform-gpu perspective-1000 w-14 h-14">
        {/* Main 3D Icon - Perfect Square with rounded corners */}
        <div
          className={`
            relative w-full h-full rounded-2xl
            ${getBgColor(isOnline)}
            ${getBorderColor(isOnline)}
            border-2
            transform transition-all duration-300 ease-out
            hover:scale-105
          `}
          style={{
            aspectRatio: "1 / 1",
          }}
        >
          {/* Lightning bolt icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className={`w-6 h-6 ${getPowerColor(isOnline)} drop-shadow-sm`}
              fill="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Power status"
            >
              <title>Power status</title>
              <path d="M13 2L3 14h6l-2 8 10-12h-6l2-8z" />
            </svg>
          </div>

          {/* Glow effect for active units */}
          {isOnline && (
            <div
              className={`
                absolute inset-0 rounded-2xl opacity-60
                bg-green-400
                blur-sm scale-110 -z-10
                animate-pulse
              `}
            />
          )}
        </div>

        {/* Power value badge - positioned to not break square shape */}
        <div
          className={`
            absolute -bottom-1 -right-1 min-w-[2.25rem] h-5
            ${getBgColor(isOnline)}
            ${getBorderColor(isOnline)}
            border rounded-full
            flex items-center justify-center
            shadow-md
            transform transition-all duration-300
            hover:scale-105
          `}
        >
          <span
            className={`
              text-xs font-bold
              ${getPowerColor(isOnline)}
              px-1
            `}
          >
            {displayValue()}
          </span>
          <span
            className={`
              text-[10px] font-medium
              ${getPowerColor(isOnline)}
              opacity-80
              ml-0.5
            `}
          >
            kW
          </span>
        </div>
      </div>

      {/* Subtle animation for online units */}
      {isOnline && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`
              absolute top-1 left-1 w-2 h-2 rounded-full
              bg-green-400
              opacity-70 animate-ping
            `}
          />
        </div>
      )}
    </div>
  );
};

export default PowerIcon3D;
