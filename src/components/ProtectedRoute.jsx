import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useSidebarMargin } from "../hooks/useSidebarMargin";
import EnhancedSideNavigation from "./SideNavigation";
import { Spinner } from "./ui/spinner";

const ProtectedRoute = ({
  component: Component,
  componentMap,
  roles = [],
  ...props
}) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const sidebarMargin = useSidebarMargin();

  // Show loading spinner while checking authentication state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Determine which component to render based on componentMap or default to Component
  // If componentMap is provided, use the component specified for the user's role.
  // Otherwise, use the default Component prop.
  const ComponentToRender =
    componentMap && componentMap[userRole] ? componentMap[userRole] : Component;

  if (!ComponentToRender) {
    // Fallback if no component is found for the user's role and no default component is provided
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <EnhancedSideNavigation userRole={userRole} />
      <ComponentToRender
        className={sidebarMargin}
        userRole={userRole}
        {...props}
      />
    </>
  );
};

export default ProtectedRoute;
