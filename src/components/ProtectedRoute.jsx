import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getFrontendRole } from "../utils/permissions";
import EnhancedSideNavigation from "./SideNavigation";
import { Spinner } from "./ui/spinner";

const ProtectedRoute = ({
  component: Component,
  componentMap,
  roles = [],
  ...props
}) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

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

  // Normalize userRole to frontend role for routing checks and component mapping
  const frontendRole = getFrontendRole(userRole);

  // Check if user has required role
  if (roles.length > 0 && !roles.includes(frontendRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Determine which component to render based on componentMap or default to Component
  // If componentMap is provided, use the component specified for the user's role.
  // Otherwise, use the default Component prop.
  const ComponentToRender = componentMap?.[frontendRole]
    ? componentMap[frontendRole]
    : Component;

  if (!ComponentToRender) {
    // Fallback if no component is found for the user's role and no default component is provided
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <EnhancedSideNavigation userRole={userRole} />
      <main className="flex-1 overflow-auto min-w-0">
        <ComponentToRender userRole={userRole} {...props} />
      </main>
    </div>
  );
};

export default ProtectedRoute;
