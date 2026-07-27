// DEPLOYMENT-FORCE-REBUILD-2026-07-27-21:30
import {
  Database,
  Edit,
  Eye,
  EyeOff,
  Key,
  Lock,
  Plus,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "../context/AuthContext";
import { deleteUser, getAllUsers, updateUser } from "../services/usersAPI";
import { apiGet, apiPost } from "../utils/apiFetch";
import { formatRoleName, formatUserName } from "../utils/userUtils";
import PageHeader from "./PageHeader";
import UserApprovalPanel from "./UserApprovalPanel";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

// Shared role label formatter - converts "client_admin" to "Client Admin"
const formatRoleLabel = (roleName) =>
  roleName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const AdminPanel = ({ className }) => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isTogglingSetting, setIsTogglingSetting] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    emailNotifications: true,
    autoBackup: true,
    maintenanceMode: false,
  });

  // User Creation Modal State
  const [createUserModal, setCreateUserModal] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    company: "",
    department: "",
    position: "",
    roleId: "",
    clientId: "",
  });
  const [availableRoles, setAvailableRoles] = useState([]);
  const [clients, setClients] = useState([]);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [rolesLoadError, setRolesLoadError] = useState(false);

  // Password Management State
  const [passwordResetModal, setPasswordResetModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Single validation state object for managing all validation
  const [validation, setValidation] = useState({
    isValidLength: false,
    passwordsMatch: false,
    isSubmitting: false,
    apiError: null,
  });

  // Compute system stats from users data
  const activeUsersCount = users.filter((u) => u.status === "Active").length;
  const systemStats = [
    { label: "Total Devices", value: "4", icon: Database },
    { label: "Active Users", value: activeUsersCount.toString(), icon: Users },
    { label: "System Uptime", value: "99.9%", icon: Shield },
    { label: "Data Points", value: "1.2M", icon: Settings },
  ];

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError(null);

    try {
      const result = await getAllUsers({ per_page: 100 });

      // Map backend response to frontend format
      const mappedUsers = result.data.map((user) => ({
        id: user.id,
        username: user.username,
        name: formatUserName(user),
        email: user.email,
        company: user.company || "N/A",
        phone: user.phone_number || "N/A",
        department: user.department || "N/A",
        position: user.position || "N/A",
        role: formatRoleName(user.role),
        status: user.is_active ? "Active" : "Inactive",
        // Raw values needed for editing/PUT
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        companyRaw: user.company || "",
        phoneRaw: user.phone_number || "",
        departmentRaw: user.department || "",
        positionRaw: user.position || "",
        roleId: user.role?.id ?? "",
        isActive: user.is_active,
      }));

      setUsers(mappedUsers);
    } catch (_error) {
      setUsersError("Failed to load users. Please try again.");
      toast.error("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Fetch available roles from backend
  const fetchRoles = async () => {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        "https://thermacoreapp.onrender.com";
      const response = await apiGet(`${API_BASE_URL}/api/v1/roles`, {
        showToastOnError: false,
      });

      if (response.ok) {
        const data = await response.json();

        // Handle both direct array and {roles: [...]} format
        let rolesArray;
        if (data.roles && Array.isArray(data.roles)) {
          rolesArray = data.roles;
        } else if (Array.isArray(data)) {
          rolesArray = data;
        } else {
          setRolesLoadError(true);
          setAvailableRoles([]);
          return;
        }

        // Ensure we have valid roles data
        if (rolesArray.length > 0) {
          setAvailableRoles(rolesArray);
          setRolesLoadError(false);
        } else {
          setRolesLoadError(true);
          setAvailableRoles([]);
        }
      } else {
        setRolesLoadError(true);
        setAvailableRoles([]);
      }
    } catch (_error) {
      setRolesLoadError(true);
      setAvailableRoles([]);
    }
  };

  // Fetch clients from backend - memoized to prevent unnecessary re-renders
  const fetchClients = useCallback(async () => {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        "https://thermacoreapp.onrender.com";
      const response = await apiGet(`${API_BASE_URL}/api/v1/clients`, {
        showToastOnError: false,
      });
      if (response.ok) {
        const data = await response.json();
        setClients(Array.isArray(data) ? data : data.data || []);
      }
    } catch (_err) {
      setClients([]);
    }
  }, []);

  // Fetch users and clients on component mount
  useEffect(() => {
    fetchUsers();
    fetchClients();
  }, [fetchUsers, fetchClients]);

  const handleAddUser = () => {
    // Open the create user modal
    setNewUserFormData({
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      company: "",
      department: "",
      position: "",
      roleId: "",
      clientId: "",
    });
    setShowCreatePassword(false);
    setCreateUserModal(true);

    // Fetch roles if not already loaded or if previous load failed
    if (availableRoles.length === 0 || rolesLoadError) {
      fetchRoles();
    }
  };

  const handleCreateUser = async () => {
    // Validate form
    if (!newUserFormData.username) {
      toast.error("Username is required");
      return;
    }
    if (!newUserFormData.email) {
      toast.error("Email is required");
      return;
    }
    if (!newUserFormData.password) {
      toast.error("Password is required");
      return;
    }
    if (!newUserFormData.roleId) {
      toast.error("Role is required");
      return;
    }

    if (newUserFormData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    // If roles failed to load, we cannot safely proceed
    if (rolesLoadError) {
      toast.error(
        "Unable to create user. Please refresh the page and try again.",
      );
      return;
    }

    setIsCreatingUser(true);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        "https://thermacoreapp.onrender.com";

      const userData = {
        username: newUserFormData.username,
        email: newUserFormData.email,
        password: newUserFormData.password,
        first_name: newUserFormData.firstName,
        last_name: newUserFormData.lastName,
        phone_number: newUserFormData.phoneNumber,
        company: newUserFormData.company,
        department: newUserFormData.department,
        position: newUserFormData.position,
        role_id: parseInt(newUserFormData.roleId, 10),
      };

      const response = await apiPost(
        `${API_BASE_URL}/api/v1/auth/register`,
        userData,
        {
          showToastOnError: false,
          retries: 2,
          retryDelay: 1000,
        },
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(`User ${newUserFormData.username} created successfully`);
        setCreateUserModal(false);

        // Refresh the user list from the backend
        await fetchUsers();
      } else {
        toast.error(result.error || result.message || "Failed to create user");
      }
    } catch (error) {
      toast.error(
        error.message ||
          "Failed to create user. Please check backend connection.",
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    if (availableRoles.length === 0 || rolesLoadError) {
      fetchRoles();
    }
  };

  const handleSaveUser = async (updatedUser) => {
    if (rolesLoadError) {
      toast.error(
        "Unable to update user. Please refresh the page and try again.",
      );
      return;
    }

    const payload = {
      username: updatedUser.username,
      email: updatedUser.email,
      first_name: updatedUser.firstName,
      last_name: updatedUser.lastName,
      phone_number: updatedUser.phoneRaw,
      company: updatedUser.companyRaw,
      department: updatedUser.departmentRaw,
      position: updatedUser.positionRaw,
      role_id: parseInt(updatedUser.roleId, 10),
      is_active: updatedUser.isActive,
    };

    try {
      await updateUser(updatedUser.id, payload);
      toast.success("User updated successfully");
      setEditingUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(
        error.message ||
          "Failed to update user. Please check backend connection.",
      );
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(userId);
        toast.success("User deleted successfully");
        // Refresh the user list
        await fetchUsers();
      } catch (_error) {
        toast.error("Failed to delete user");
      }
    }
  };

  const handleToggleSetting = async (setting) => {
    // Prevent double-clicks while a request is in flight
    if (isTogglingSetting) return;
    setIsTogglingSetting(true);

    const newValue = !systemSettings[setting];

    // Optimistic update
    setSystemSettings((prev) => ({
      ...prev,
      [setting]: newValue,
    }));

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        "https://thermacoreapp.onrender.com";
      const response = await apiPost(
        `${API_BASE_URL}/api/v1/settings`,
        { [setting]: newValue },
        { showToastOnError: false, retries: 1, retryDelay: 1000 },
      );

      if (!response.ok) {
        let errorMsg = "Failed to update setting";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (_e) {
          // Fallback to default error message
        }
        throw new Error(errorMsg);
      }

      toast.success(`${setting} ${newValue ? "enabled" : "disabled"} successfully`);
    } catch (error) {
      // Rollback on error
      setSystemSettings((prev) => ({
        ...prev,
        [setting]: !newValue,
      }));
      toast.error(error.message || `Failed to update ${setting}`);
    } finally {
      setIsTogglingSetting(false);
    }
  };

  // Real-time validation function that updates on every keystroke
  const validateInRealTime = (newPass, confirmPass) => {
    const isValidLength = newPass.length >= 6;
    const passwordsMatch = newPass === confirmPass && confirmPass.length > 0;

    setValidation((prev) => ({
      ...prev,
      isValidLength,
      passwordsMatch,
      apiError: null, // Clear stale API error on any user input
    }));
  };

  // Helper functions for error display logic
  const shouldShowLengthError = () => {
    return (
      !validation.apiError &&
      passwordFormData.newPassword.length > 0 &&
      !validation.isValidLength
    );
  };

  const shouldShowMismatchError = () => {
    return (
      !validation.apiError &&
      validation.isValidLength &&
      passwordFormData.confirmPassword.length > 0 &&
      !validation.passwordsMatch
    );
  };

  // Password Management Functions
  const openPasswordResetModal = (user) => {
    setSelectedUserForReset(user);
    setPasswordFormData({ newPassword: "", confirmPassword: "" });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setValidation({
      isValidLength: false,
      passwordsMatch: false,
      isSubmitting: false,
      apiError: null,
    });
    setPasswordResetModal(true);
  };

  const closePasswordResetModal = () => {
    setPasswordResetModal(false);
    setSelectedUserForReset(null);
    setPasswordFormData({ newPassword: "", confirmPassword: "" });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setValidation({
      isValidLength: false,
      passwordsMatch: false,
      isSubmitting: false,
      apiError: null,
    });
  };

  const handlePasswordReset = async () => {
    // Validation should already be checked by button disabled state
    // But double-check here for safety
    if (!validation.isValidLength || !validation.passwordsMatch) {
      return;
    }

    setValidation((prev) => ({
      ...prev,
      isSubmitting: true,
    }));

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        "https://thermacoreapp.onrender.com";

      const response = await apiPost(
        `${API_BASE_URL}/api/v1/users/${selectedUserForReset.id}/reset-password`,
        { new_password: passwordFormData.newPassword },
        {
          showToastOnError: false, // We'll handle errors ourselves
          retries: 2, // Retry failed requests twice
          retryDelay: 1000, // Wait 1 second between retries
        },
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Password reset successfully for ${selectedUserForReset.name}`,
        );
        closePasswordResetModal();
      } else {
        // Set validation with error state
        setValidation((prev) => ({
          ...prev,
          isSubmitting: false,
          apiError:
            result.error || result.message || "Failed to reset password",
        }));
      }
    } catch (error) {
      // Provide user-friendly error messages with backend connection details
      let errorMsg = "Failed to reset password. ";

      if (error.message.includes("Failed to fetch")) {
        errorMsg +=
          "Unable to connect to backend server. Please check that the backend is running and accessible.";
      } else if (error.message.includes("network")) {
        errorMsg +=
          "Network error occurred. Please check your internet connection and backend connectivity.";
      } else if (error.message.includes("timeout")) {
        errorMsg +=
          "The request timed out. The backend server may be slow or unresponsive. Please try again.";
      } else if (error.message.includes("CORS")) {
        errorMsg +=
          "Cross-origin request blocked. Please verify backend CORS configuration allows requests from this domain.";
      } else {
        errorMsg +=
          error.message ||
          "An unexpected error occurred. Please check the backend logs.";
      }

      setValidation((prev) => ({
        ...prev,
        isSubmitting: false,
        apiError: errorMsg,
      }));
    }
  };

  const handleSelfPasswordReset = () => {
    if (currentUser) {
      // Create a user object for self-password reset
      const selfUser = {
        id: currentUser.id ?? 1, // only fall back when id is null/undefined
        name:
          currentUser.firstName && currentUser.lastName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.username,
        email: currentUser.email || "",
      };
      openPasswordResetModal(selfUser);
    }
  };

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Admin Panel"
          subtitle="Manage users, devices, and system settings"
        />

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {systemStats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <Card key={stat.label} className="bg-white dark:bg-gray-900">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {stat.label}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex flex-wrap gap-x-4 gap-y-2">
              {[
                { id: "users", label: "Users", icon: Users },
                {
                  id: "user-approvals",
                  label: "User Approvals",
                  icon: UserCheck,
                },
                {
                  id: "password-management",
                  label: "Password Management",
                  icon: Key,
                },
                { id: "settings", label: "Settings", icon: Settings },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                User Management
              </h3>
              {/* PINK BUTTON WITH FORCE REBUILD TEXT */}
              <button
                type="button"
                onClick={handleAddUser}
                className="flex items-center space-x-2 px-3 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>🚀 FORCE REBUILD 🚀</span>
              </button>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Loading users...
                    </p>
                  </div>
                </div>
              ) : usersError ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {usersError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchUsers}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No users found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          Company
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          Phone
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                            {user.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                            {user.email}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate">
                            {user.company}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {user.phone}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 whitespace-nowrap">
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                                user.status === "Active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleEditUser(user)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Approvals Tab */}
        {activeTab === "user-approvals" && <UserApprovalPanel />}

        {/* Password Management Tab */}
        {activeTab === "password-management" && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-gray-900">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Password Management
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Reset passwords for users or update your own password
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Your Account
                  </h4>
                  <button
                    type="button"
                    onClick={handleSelfPasswordReset}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Change My Password</span>
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    User Password Reset
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            Role
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-gray-100 dark:border-gray-800"
                          >
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                              {user.name}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                              {user.email}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 whitespace-nowrap">
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => openPasswordResetModal(user)}
                                className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors whitespace-nowrap"
                              >
                                <Key className="h-3 w-3" />
                                <span>Reset Password</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create User Modal */}
        {createUserModal && (
          <div className="modal-overlay fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl rounded-b-none sm:rounded-xl p-6 w-full max-w-lg max-h-[95vh] flex flex-col my-auto shadow-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Create New User
                </h3>
                <button
                  type="button"
                  onClick={() => setCreateUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md transition-colors"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                <div>
                  <label
                    htmlFor="newUserUsername"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="newUserUsername"
                    type="text"
                    value={newUserFormData.username}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        username: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label
                    htmlFor="newUserEmail"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="newUserEmail"
                    type="email"
                    value={newUserFormData.email}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label
                    htmlFor="newUserPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="newUserPassword"
                      type={showCreatePassword ? "text" : "password"}
                      value={newUserFormData.password}
                      onChange={(e) =>
                        setNewUserFormData({
                          ...newUserFormData,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Enter password (min 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showCreatePassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={newUserFormData.firstName}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        firstName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={newUserFormData.lastName}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        lastName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={newUserFormData.phoneNumber}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Company
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={newUserFormData.company}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        company: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="department"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Department
                  </label>
                  <input
                    id="department"
                    type="text"
                    value={newUserFormData.department}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter department"
                  />
                </div>
                <div>
                  <label
                    htmlFor="position"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Position
                  </label>
                  <input
                    id="position"
                    type="text"
                    value={newUserFormData.position}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        position: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter position"
                  />
                </div>
                <div>
                  <label
                    htmlFor="user-role-select"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Role <span className="text-red-500">*</span>
                  </label>
                  {rolesLoadError ? (
                    <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                      Unable to load roles. Please refresh the page.
                    </div>
                  ) : (
                    <select
                      id="user-role-select"
                      value={newUserFormData.roleId}
                      onChange={(e) =>
                        setNewUserFormData({
                          ...newUserFormData,
                          roleId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      disabled={availableRoles.length === 0}
                    >
                      <option value="">
                        {availableRoles.length === 0
                          ? "Loading roles..."
                          : "Select a role"}
                      </option>
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {formatRoleLabel(role.name)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setCreateUserModal(false)}
                  disabled={isCreatingUser}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={
                    isCreatingUser ||
                    rolesLoadError ||
                    availableRoles.length === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCreatingUser && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isCreatingUser ? "Creating..." : "Create User"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="modal-overlay fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl rounded-b-none sm:rounded-xl p-6 w-full max-w-lg max-h-[95vh] flex flex-col my-auto shadow-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Edit User
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md transition-colors"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                <div>
                  <label
                    htmlFor="editUsername"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Username
                  </label>
                  <input
                    id="editUsername"
                    type="text"
                    value={editingUser.username}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editFirstName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    First Name
                  </label>
                  <input
                    id="editFirstName"
                    type="text"
                    value={editingUser.firstName}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editLastName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Last Name
                  </label>
                  <input
                    id="editLastName"
                    type="text"
                    value={editingUser.lastName}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editEmail"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="editEmail"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editCompany"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Company
                  </label>
                  <input
                    id="editCompany"
                    type="text"
                    value={editingUser.companyRaw}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, companyRaw: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editPhone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Phone
                  </label>
                  <input
                    id="editPhone"
                    type="tel"
                    value={editingUser.phoneRaw}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, phoneRaw: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editRole"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Role
                  </label>
                  {rolesLoadError ? (
                    <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                      Unable to load roles. Please refresh the page.
                    </div>
                  ) : (
                    <select
                      id="editRole"
                      value={editingUser.roleId}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, roleId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      disabled={availableRoles.length === 0}
                    >
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {formatRoleLabel(role.name)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="editStatus"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="editStatus"
                    value={editingUser.isActive ? "true" : "false"}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, isActive: e.target.value === "true" })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveUser(editingUser)}
                  disabled={rolesLoadError || availableRoles.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {passwordResetModal && selectedUserForReset && (
          <div className="modal-overlay fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 sm:p-6">
            <div
              className="bg-white dark:bg-gray-900 rounded-xl rounded-b-none sm:rounded-xl p-6 w-full max-w-lg max-h-[95vh] flex flex-col my-auto shadow-2xl border border-gray-200 dark:border-gray-800"
              data-testid="password-reset-modal"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Reset Password
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Resetting password for:{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedUserForReset.name}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePasswordResetModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md transition-colors"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                <div>
                  <label
                    htmlFor="resetNewPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="resetNewPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordFormData.newPassword}
                      onChange={(e) => {
                        const newPassword = e.target.value;
                        setPasswordFormData({
                          ...passwordFormData,
                          newPassword,
                        });
                        validateInRealTime(
                          newPassword,
                          passwordFormData.confirmPassword,
                        );
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="resetConfirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="resetConfirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordFormData.confirmPassword}
                      onChange={(e) => {
                        const newConfirmPassword = e.target.value;
                        setPasswordFormData({
                          ...passwordFormData,
                          confirmPassword: newConfirmPassword,
                        });
                        validateInRealTime(
                          passwordFormData.newPassword,
                          newConfirmPassword,
                        );
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {validation.apiError && (
                  <div
                    className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md"
                    data-testid="password-error"
                    role="alert"
                  >
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {validation.apiError}
                    </p>
                  </div>
                )}

                {shouldShowLengthError() && (
                  <div
                    className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                )}

                {shouldShowMismatchError() && (
                  <div
                    className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      Passwords do not match
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
                <button
                  type="button"
                  onClick={closePasswordResetModal}
                  disabled={validation.isSubmitting}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={
                    !validation.isValidLength ||
                    !validation.passwordsMatch ||
                    validation.isSubmitting
                  }
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                    validation.isValidLength &&
                    validation.passwordsMatch &&
                    !validation.isSubmitting
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-400 text-gray-200"
                  }`}
                >
                  {validation.isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>
                    {validation.isSubmitting
                      ? "Resetting..."
                      : "Reset Password"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-gray-900">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  System Settings
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Email Notifications
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Send email alerts for critical events
                    </p>
                  </div>
                  <Button
                    onClick={() => handleToggleSetting("emailNotifications")}
                    disabled={isTogglingSetting}
                    className="ml-4"
                  >
                    {systemSettings.emailNotifications ? "Disable" : "Enable"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Auto Backup
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically backup system data daily
                    </p>
                  </div>
                  <Button
                    onClick={() => handleToggleSetting("autoBackup")}
                    disabled={isTogglingSetting}
                    className="ml-4"
                  >
                    {systemSettings.autoBackup ? "Disable" : "Enable"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Maintenance Mode
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enable maintenance mode for system updates
                    </p>
                  </div>
                  <Button
                    onClick={() => handleToggleSetting("maintenanceMode")}
                    disabled={isTogglingSetting}
                    className="ml-4"
                  >
                    {systemSettings.maintenanceMode ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
