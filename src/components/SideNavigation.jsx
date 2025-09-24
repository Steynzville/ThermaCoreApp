import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import playSound from "../utils/audioPlayer";
import {
  LayoutDashboard,
  Grid3X3,
  History,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Wrench,
  BarChart3,
  Search,
  Wifi,
  AlertTriangle,
  Menu,
  X,
  Siren,
  FileText,
} from "lucide-react";
import { units as mockUnits } from "../data/mockUnits";

const EnhancedSideNavigation = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { userRole, logout } = useAuth();
  const { settings } = useSettings();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [units, setUnits] = useState([]);

  useEffect(() => {
    if (userRole === "admin") {
      setUnits(mockUnits);
    } else {
      setUnits(mockUnits.slice(0, 6));
    }
  }, [userRole]);

  const totalUnits = units.length;
  const totalAlerts = 6;
  const totalAlarms = units.filter((unit) => unit.hasAlarm).length;

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      badge: null,
      roles: ["admin", "user"],
    },
    {
      id: "grid-view",
      label: "Units Overview",
      icon: Grid3X3,
      href: "/grid-view",
      badge: totalUnits,
      roles: ["admin", "user"],
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: AlertTriangle,
      href: "/alerts",
      badge: totalAlerts,
      badgeColor: "orange",
      roles: ["admin", "user"],
    },
    {
      id: "alarms",
      label: "Alarms!",
      icon: Siren,
      href: "/alarms",
      badge: totalAlarms,
      badgeColor: "red",
      roles: ["admin", "user"],
    },
    {
      id: "history",
      label: "History",
      icon: History,
      href: "/history",
      badge: null,
      roles: ["admin", "user"],
    },
    {
      id: "reports",
      label: "Reports",
      icon: Search,
      href: "/reports",
      badge: null,
      roles: ["admin", "user"],
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText,
      href: "/documents",
      badge: null,
      roles: ["admin", "user"],
    },
    {
      id: "analytics",
      label: "Sales",
      icon: BarChart3,
      href: "/analytics",
      badge: null,
      roles: ["admin"],
    },
    {
      id: "system-health",
      label: "System Health",
      icon: Wifi,
      href: "/system-health",
      badge: null,
      roles: ["admin"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/settings",
      badge: null,
      roles: ["admin", "user"],
    },
    {
      id: "admin",
      label: "Admin Panel",
      icon: Shield,
      href: "/admin",
      badge: null,
      roles: ["admin"],
    },
  ];

  const filteredNavItems = navigationItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const handleNavClick = (item) => {
    navigate(item.href);
    setIsMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    playSound("logout-sound.mp3", settings.soundEnabled, settings.volume);
    await logout();
    navigate("/login");
  };

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    return (
      <div
        className={`
          group relative flex items-center w-full p-3 rounded-lg cursor-pointer
          transition-all duration-300 mb-1
          ${
            isActive
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }
        `}
        onClick={() => handleNavClick(item)}
      >
        <Icon
          className={`h-5 w-5 ${isCollapsed ? "mx-auto" : "mr-3"} flex-shrink-0`}
        />
        {!isCollapsed && (
          <>
            <span className="font-medium flex-1">{item.label}</span>
            {item.badge > 0 && (
              <span
                className={`
                px-2 py-1 text-xs font-semibold rounded-full
                ${
                  item.badgeColor === "orange"
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                    : item.badgeColor === "red"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                }
              `}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
      >
        {isMobileOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black"
          style={{ 
            position: 'fixed',
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100vw', 
            height: '100vh',
            minWidth: '100vw',
            minHeight: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            margin: 0,
            padding: 0,
            backgroundColor: 'rgb(0, 0, 0)',
            zIndex: 40
          }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={`
        fixed left-0 top-0 h-full bg-white dark:bg-gray-900 z-50
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "w-16 xl:w-20" : "w-48 lg:w-56 xl:w-64"}
      `}
      >
        <div
          className={`flex items-center p-4 border-b border-gray-200 dark:border-gray-700 ${isCollapsed ? "justify-center" : "justify-between"}`}
        >
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Wifi className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  ThermaCore
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Monitor
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 h-[calc(100vh-200px)]"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 transparent",
          }}
        >
          <nav className="space-y-1">
            {filteredNavItems.map((item) => (
              <div key={item.id}>
                <NavItem item={item} />
                {item.id === "admin" && userRole === "admin" && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1 mb-2"
                  >
                    <LogOut
                      className={`h-5 w-5 ${isCollapsed ? "mx-auto" : "mr-3"} flex-shrink-0`}
                    />
                    {!isCollapsed && (
                      <span className="font-medium">Logout</span>
                    )}
                  </button>
                )}
                {item.id === "settings" && userRole === "user" && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1 mb-2"
                  >
                    <LogOut
                      className={`h-5 w-5 ${isCollapsed ? "mx-auto" : "mr-3"} flex-shrink-0`}
                    />
                    {!isCollapsed && (
                      <span className="font-medium">Logout</span>
                    )}
                  </button>
                )}
              </div>
            ))}
          </nav>
        </div>

        {!(
          (userRole === "admin" &&
            filteredNavItems.some((item) => item.id === "admin")) ||
          (userRole === "user" &&
            filteredNavItems.some((item) => item.id === "settings"))
        ) && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {!isCollapsed && (
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    System {userRole === "admin" ? "Admin" : "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userRole === "admin"
                      ? "admin@thermacore.com"
                      : "user@thermacore.com"}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`
                flex items-center w-full p-2 rounded-lg text-red-600 dark:text-red-400 
                hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                ${isCollapsed ? "justify-center" : "space-x-2"}
              `}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && (
                <span className="text-sm font-medium">Logout</span>
              )}
            </button>
          </div>
        )}
      </div>

      <div
        className={`
        hidden lg:block transition-all duration-300
        ${isCollapsed ? "w-16 xl:w-20" : "w-48 lg:w-56 xl:w-64"}
      `}
      />
    </>
  );
};

export default EnhancedSideNavigation;
