import React from "react";

const PowerIcon3D = ({ power, className = "" }) => {
  // Determine color based on power level
  const getPowerColor = (powerValue) => {
    if (powerValue === 0) return "text-gray-400 dark:text-gray-600";
    return "text-green-500 dark:text-green-400";
  };

  const getBgColor = (powerValue) => {
    if (powerValue === 0) return "bg-gray-100 dark:bg-gray-800";
    return "bg-green-50 dark:bg-green-900";
  };

  const getBorderColor = (powerValue) => {
    if (powerValue === 0) return "border-gray-200 dark:border-gray-700";
    // Light mode: darker green, Dark mode: bright light neon green
    return "border-green-700 dark:border-lime-400";
  };

  const getShadowColor = (powerValue) => {
    if (powerValue === 0) return "shadow-gray-200/50 dark:shadow-gray-800/50";
    return "shadow-green-300/50 dark:shadow-lime-600/30";
  };

  return (
    <div className={`relative ${className}`}>
      {/* 3D Container with perspective - ensuring perfect square aspect ratio */}
      <div className="relative transform-gpu perspective-1000 w-14 h-14">
        {/* Main 3D Icon - Perfect Square with rounded corners */}
        <div
          className={`
            relative w-full h-full rounded-2xl
            ${getBgColor(power)}
            ${getBorderColor(power)}
            border-2
            transform transition-all duration-300 ease-out
            hover:scale-100
          `}
          style={{
            aspectRatio: "1 / 1",
          }}
        >
          {/* Lightning bolt icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className={`w-6 h-6 ${getPowerColor(power)} drop-shadow-sm`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M13 2L3 14h6l-2 8 10-12h-6l2-8z" />
            </svg>
          </div>

          {/* Glow effect for active units */}
          {power > 0 && (
            <div
              className={`
                absolute inset-0 rounded-2xl opacity-60
                ${power === 0 ? "bg-gray-400" : "bg-green-400"}
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
            ${getBgColor(power)}
            ${getBorderColor(power)}
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
              ${getPowerColor(power)}
              px-1
            `}
          >
            {power}
          </span>
          <span
            className={`
              text-[10px] font-medium
              ${getPowerColor(power)}
              opacity-80
            `}
          >
            kW
          </span>
        </div>
      </div>

      {/* Subtle animation for online units */}
      {power > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`
              absolute top-1 left-1 w-2 h-2 rounded-full
              ${power === 0 ? "bg-gray-400" : "bg-green-400"}
              opacity-70 animate-ping
            `}
          />
        </div>
      )}
    </div>
  );
};

export default PowerIcon3D;
