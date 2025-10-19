import React from "react";

const PageHeader = ({
  title,
  subtitle,
  description, // Alternative to subtitle for longer descriptions
  icon,
  actions, // Action buttons or components to display on the right
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  size = "default", // "small", "default", "large"
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return {
          container: "mb-4",
          title: "text-lg font-semibold",
          subtitle: "text-sm",
        };
      case "large":
        return {
          container: "mb-8",
          title: "text-2xl font-bold",
          subtitle: "text-lg",
        };
      default:
        return {
          container: "mb-6",
          title: "text-xl font-semibold",
          subtitle: "text-base",
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const displaySubtitle = subtitle || description;

  return (
    <div className={`${sizeClasses.container} ${className}`}>
      <div
        className={`flex items-start justify-between ${actions ? "flex-row" : ""}`}
      >
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <h1
              className={`${sizeClasses.title} text-gray-800 dark:text-white ${titleClassName}`}
            >
              {title}
            </h1>
          </div>
          {displaySubtitle && (
            <p
              className={`${sizeClasses.subtitle} text-gray-600 dark:text-gray-400 mt-2 ${subtitleClassName}`}
            >
              {displaySubtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
