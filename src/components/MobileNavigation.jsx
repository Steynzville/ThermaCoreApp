import React from "react";
import { Home, History, Users, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { name: "Dashboard", icon: Home, route: "/dashboard" },
  { name: "History", icon: History, route: "/history" },
  { name: "Admin", icon: Users, route: "/admin" },
  { name: "Settings", icon: Settings, route: "/settings" },
];

const MobileNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.route);
          const IconComponent = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.route)}
              className={`flex flex-col items-center justify-center min-h-[48px] px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
              aria-label={item.name}
            >
              <IconComponent size={20} />
              <span className="text-xs mt-1">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
