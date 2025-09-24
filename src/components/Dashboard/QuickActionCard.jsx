import { ChevronRight } from "lucide-react";
import React, { useState } from "react";

// Quick Action Card
const QuickActionCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  color = "blue",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700
        cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105
        ${isHovered ? "shadow-xl" : ""}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
        p-3 rounded-lg w-fit mb-4 transition-transform duration-300
        ${color === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" : ""}
        ${color === "purple" ? "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400" : ""}
        ${color === "green" ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" : ""}
        ${isHovered ? "scale-110" : ""}
      `}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      <ChevronRight
        className={`
        h-4 w-4 text-gray-400 mt-2 transition-transform duration-300
        ${isHovered ? "transform translate-x-1" : ""}
      `}
      />
    </div>
  );
};

export default QuickActionCard;
