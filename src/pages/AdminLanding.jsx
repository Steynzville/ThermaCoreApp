import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import TenantSwitcher from "../components/admin/TenantSwitcher";

/**
 * Admin Landing Page
 *
 * First page admins see after login. Features:
 * - Welcome message with username
 * - Tenant switcher dropdown
 * - Redirects to dashboard when tenant is selected
 * - Look and feel matches login page
 */
const AdminLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // Redirect to dashboard when tenant is selected
  useEffect(() => {
    if (currentTenant) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentTenant, navigate]);

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
