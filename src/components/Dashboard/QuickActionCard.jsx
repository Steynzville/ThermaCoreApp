import { ChevronRight } from "lucide-react";
import { useState } from "react";

// Color mapping for icon variants - hoisted outside component for performance
const COLOR_MAP = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
};

// Quick Action Card
const QuickActionCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  color = "blue",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // NOTE: Unrecognized colors fall back to blue theme (intentional default)
  const iconColorClasses = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <button
      type="button"
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
        ${iconColorClasses}
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
    </button>
  );
};

export default QuickActionCard;
