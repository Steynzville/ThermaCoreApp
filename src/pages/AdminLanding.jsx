import { useNavigate } from "react-router-dom";
// ✅ REMOVED: useTenant - no longer needed (TenantSwitcher handles selection)
import { useAuth } from "../context/AuthContext";
import TenantSwitcher from "../components/admin/TenantSwitcher";
import { Button } from "../components/ui/button";

/**
 * Admin Landing Page (Tenant Switcher)
 *
 * First page admins see after login. Features:
 * - Welcome message with username
 * - Tenant switcher dropdown
 * - "Go to Dashboard" button
 * - Navigates to dashboard when button is clicked
 * - Sets session flag so Dashboard knows admin has made a selection
 * - Look and feel matches login page
 *
 * BEHAVIOR:
 * - "All Tenants" → Dashboard shows all 20 units (admin view)
 * - Specific Tenant → Dashboard shows 6 units (user view)
 *
 * NOTE: The tenant selection is handled entirely by TenantSwitcher,
 * which updates TenantContext. AdminLanding just provides the UI
 * and the navigation button.
 */
const AdminLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoToDashboard = () => {
    // Set session flag so Dashboard knows admin has made a selection
    // This prevents the Dashboard from redirecting back to /admin
    let flagSet = false;
    try {
      sessionStorage.setItem("tenant_selected", "true");
      flagSet = true;
    } catch (_error) {
      // Fallback: use a query param if sessionStorage is unavailable
      // This ensures the user can still proceed to the dashboard
      // even when storage is blocked.
    }
    
    // If sessionStorage failed, use query param as backup
    // NOTE: This is a convenience fallback, not a security mechanism.
    // The param is checked by Dashboard to allow entry when storage is blocked.
    const targetPath = flagSet ? "/dashboard" : "/dashboard?tenant_selected=true";
    navigate(targetPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            ThermaCore
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            SCADA Platform
          </p>
        </div>

        {/* Welcome Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Welcome back, {user?.firstName || user?.name || "Admin"}!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Select the tenant you'd like to explore, or choose "All Tenants" to view all units.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Tenant
              </label>
              <TenantSwitcher />
            </div>

            <Button
              onClick={handleGoToDashboard}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              You can switch tenants at any time from the dashboard header.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} ThermaCore Renewable Technologies
        </p>
      </div>
    </div>
  );
};

export default AdminLanding;
