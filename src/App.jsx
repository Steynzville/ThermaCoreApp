import "./App.css";

import React, { useEffect, useRef, useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";

import Spinner from "./components/common/Spinner";
import ForgotPassword from "./components/ForgotPassword";
import LoginScreen from "./components/LoginScreen";
import PasswordResetRequest from "./components/PasswordResetRequest";
import ProtectedRoute from "./components/ProtectedRoute";
// Removed static imports for UnitControl, UnitDetails, UserUnitDetails
import ThemeToggle from "./components/ThemeToggle";
import routes from "./config/routes";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { SidebarProvider } from "./context/SidebarContext";
import { TenantProvider } from "./context/TenantContext";
import { ThemeProvider } from "./context/ThemeContext";
import { UnitProvider } from "./context/UnitContext";
import playSound from "./utils/audioPlayer";

// Component to handle scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

const AppContent = () => {
  const { isAuthenticated, isLoading, isLoggingOut, user } = useAuth();
  const { settings } = useSettings();
  const isInitialMount = useRef(true);
  const [loginError, setLoginError] = useState("");
  const [appError, setAppError] = useState(null);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      setAppError(error.message || "An unexpected error occurred");
    };

    const handleUnhandledRejection = (_event) => {
      setAppError("A network or processing error occurred");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Play sound only if enabled and user exists
    if (user && settings.soundEnabled) {
      try {
        playSound("login-sound.mp3", settings.soundEnabled, settings.volume);
      } catch (_error) {
        // Don't set app error for sound issues
      }
    }
  }, [user, settings.soundEnabled, settings.volume]);

  // Show error state if there's an application error
  if (appError) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-950 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
            Something went wrong
          </h1>
          <p className="text-red-600 dark:text-red-400 mb-6">{appError}</p>
          <button
            type="button"
            onClick={() => {
              setAppError(null);
              window.location.reload();
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Show consistent loading spinner while checking authentication state
  if (isLoading || isLoggingOut) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {isLoggingOut ? "Signing out..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const roleBasedComponents = {
    "unit-role-based": {
      admin: React.lazy(() => import("./components/UnitControl")),
      user: React.lazy(() => import("./components/UserUnitDetails")),
    },
    "unit-details-role-based": {
      admin: React.lazy(() => import("./components/UnitDetails")),
      user: React.lazy(() => import("./components/UserUnitDetails")),
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <ScrollToTop />
      <ThemeToggle />

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={<LoginScreen error={loginError} setError={setLoginError} />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<PasswordResetRequest />} />

        {/* Public Routes from configuration */}
        {routes
          .filter((route) => !route.isProtected)
          .map((route, index) => (
            <Route
              key={`public-${route.path}-${index}`}
              path={route.path}
              element={
                <React.Suspense
                  fallback={
                    <div className="min-h-screen bg-blue-50 dark:bg-gray-950 flex items-center justify-center">
                      <div className="text-center">
                        <Spinner size="lg" className="mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          Loading page...
                        </p>
                      </div>
                    </div>
                  }
                >
                  <route.component />
                </React.Suspense>
              }
            />
          ))}

        {/* Protected Routes from configuration */}
        {isAuthenticated &&
          routes
            .filter((route) => route.isProtected)
            .map((route, index) => {
              const componentMap = route.specialHandling
                ? roleBasedComponents[route.specialHandling]
                : null;

              return (
                <Route
                  key={`${route.path}-${index}`}
                  path={route.path}
                  element={
                    <React.Suspense
                      fallback={
                        <div className="min-h-screen bg-blue-50 dark:bg-gray-950 flex items-center justify-center">
                          <div className="text-center">
                            <Spinner size="lg" className="mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
                              Loading page...
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <ProtectedRoute
                        component={route.component}
                        componentMap={componentMap}
                        roles={route.roles}
                      />
                    </React.Suspense>
                  }
                />
              );
            })}

        {/* Redirect to login if not authenticated */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <TenantProvider>
            <UnitProvider>
              <SidebarProvider>
                <Router>
                  <AppContent />
                </Router>
              </SidebarProvider>
            </UnitProvider>
          </TenantProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;
