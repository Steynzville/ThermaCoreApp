
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useSidebarMargin } from "../hooks/useSidebarMargin";
import EnhancedSideNavigation from "./SideNavigation";
import Spinner from "./common/Spinner";

const ProtectedRoute = ({
  component: Component,
  componentMap,
  roles = [],
  ...props
}) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const sidebarMargin = useSidebarMargin();

  // Debug logging for authentication state
  console.log('[ProtectedRoute] Auth State:', {
    isAuthenticated,
    userRole,
    isLoading,
    requiredRoles: roles,
    componentName: Component?.name || 'Unknown',
  });

  // Show loading spinner while checking authentication state
  if (isLoading) {
    console.log('[ProtectedRoute] Still loading authentication...');

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
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (roles.length > 0 && !roles.includes(userRole)) {
    console.log('[ProtectedRoute] User lacks required role, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Determine which component to render based on componentMap or default to Component
  // If componentMap is provided, use the component specified for the user's role.
  // Otherwise, use the default Component prop.
  const ComponentToRender =
    componentMap && componentMap[userRole] ? componentMap[userRole] : Component;

  if (!ComponentToRender) {
    console.log('[ProtectedRoute] No component to render, redirecting to dashboard');
    // Fallback if no component is found for the user's role and no default component is provided
    return <Navigate to="/dashboard" replace />;
  }

  console.log('[ProtectedRoute] Rendering protected component:', ComponentToRender.name || 'Unknown');

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
