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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "../context/AuthContext";
import { deleteUser, getAllUsers } from "../services/usersAPI";
import { apiGet, apiPost } from "../utils/apiFetch";
import { formatRoleName, formatUserName } from "../utils/userUtils";
import PageHeader from "./PageHeader";
import UserApprovalPanel from "./UserApprovalPanel";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

const systemStats = [
  { label: "Total Devices", value: "4", icon: Database },
  { label: "Active Users", value: "2", icon: Users },
  { label: "System Uptime", value: "99.9%", icon: Shield },
  { label: "Data Points", value: "1.2M", icon: Settings },
];

const AdminPanel = ({ className }) => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
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
  });
  const [availableRoles, setAvailableRoles] = useState([]);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [rolesLoadError, setRolesLoadError] = useState(false);

  // Mounted ref to prevent state updates after unmount
  const isMountedRef = useRef(true);

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
  });

  // Fetch users from backend
  const fetchUsers = async () => {
    if (isMountedRef.current) {
      setIsLoadingUsers(true);
      setUsersError(null);
    }

    try {
      const result = await getAllUsers({ per_page: 100 });

      // Map backend response to frontend format
      const mappedUsers = result.data.map((user) => ({
        id: user.id,
        name: formatUserName(user),
        email: user.email,
        company: user.company || "N/A",
        phone: user.phone_number || "N/A",
        department: user.department || "N/A",
        position: user.position || "N/A",
        role: formatRoleName(user.role),
        status: user.is_active ? "Active" : "Inactive",
      }));

      if (isMountedRef.current) {
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      if (isMountedRef.current) {
        setUsersError("Failed to load users. Please try again.");
        toast.error("Failed to load users");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingUsers(false);
      }
    }
  };

  // Fallback roles with proper format
  const _fallbackRoles = [
    { value: "admin", label: "Admin" },
    { value: "operator", label: "Operator" },
    { value: "viewer", label: "Viewer" },
  ];

  // Fetch available roles from backend
  const fetchRoles = async () => {
    try {
      console.log("🔄 Fetching roles from API...");
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";
      const response = await apiGet(`${API_BASE_URL}/api/v1/roles`, {
        showToastOnError: false,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Roles API response:", data);

        // Handle both direct array and {roles: [...]} format
        let rolesArray;
        if (data.roles && Array.isArray(data.roles)) {
          rolesArray = data.roles;
        } else if (Array.isArray(data)) {
          rolesArray = data;
        } else {
          console.warn("⚠️ Roles data is not in expected format");
          if (isMountedRef.current) {
            setRolesLoadError(true);
            setAvailableRoles([]);
          }
          return;
        }

        // Ensure we have valid roles data
        if (rolesArray.length > 0) {
          if (isMountedRef.current) {
            setAvailableRoles(rolesArray);
            setRolesLoadError(false);
          }
          console.log("📋 Roles set:", rolesArray);
        } else {
          console.warn("⚠️ Roles array is empty");
          if (isMountedRef.current) {
            setRolesLoadError(true);
            setAvailableRoles([]);
          }
        }
      } else {
        console.error("❌ Roles API failed:", response.status);
        if (isMountedRef.current) {
          setRolesLoadError(true);
          setAvailableRoles([]);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching roles:", error);
      if (isMountedRef.current) {
        setRolesLoadError(true);
        setAvailableRoles([]);
      }
    }
  };

  // Fetch users on component mount
  useEffect(() => {
    isMountedRef.current = true;
    fetchUsers();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      toast.error("Unable to create user. Please refresh the page and try again.");
      return;
    }

    if (isMountedRef.current) {
      setIsCreatingUser(true);
    }

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

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
        role_id: Number.parseInt(newUserFormData.roleId, 10),
      };

      const response = await apiPost(`${API_BASE_URL}/api/v1/auth/register`, userData, {
        showToastOnError: false,
        retries: 2,
        retryDelay: 1000,
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`User ${newUserFormData.username} created successfully`);
        if (isMountedRef.current) {
          setCreateUserModal(false);
        }

        // Refresh the user list from the backend
        await fetchUsers();
      } else {
        toast.error(result.error || result.message || "Failed to create user");
      }
    } catch (error) {
      console.error("User creation failed:", error);
      toast.error(error.message || "Failed to create user. Please check backend connection.");
    } finally {
      if (isMountedRef.current) {
        setIsCreatingUser(false);
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
  };

  const handleSaveUser = (updatedUser) => {
    setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(userId);
        toast.success("User deleted successfully");
        // Refresh the user list
        await fetchUsers();
      } catch (error) {
        console.error("Failed to delete user:", error);
        toast.error("Failed to delete user");
      }
    }
  };

  const handleToggleSetting = (setting) => {
    setSystemSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  // Real-time validation function that updates on every keystroke
  const validateInRealTime = (newPass, confirmPass) => {
    const isValidLength = newPass.length >= 6;
    const passwordsMatch = newPass === confirmPass && confirmPass.length > 0;

    setValidation((prev) => ({
      ...prev,
      isValidLength,
      passwordsMatch,
    }));
  };

  // Helper functions for error display logic
  const shouldShowLengthError = () => {
    return (
      !validation.apiError && passwordFormData.newPassword.length > 0 && !validation.isValidLength
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
    });
  };

  const handlePasswordReset = async () => {
    // Validation should already be checked by button disabled state
    // But double-check here for safety
    if (!validation.isValidLength || !validation.passwordsMatch) {
      return;
    }

    if (isMountedRef.current) {
      setValidation((prev) => ({
        ...prev,
        isSubmitting: true,
      }));
    }

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

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
        toast.success(`Password reset successfully for ${selectedUserForReset.name}`);
        if (isMountedRef.current) {
          closePasswordResetModal();
        }
      } else {
        // Set validation with error state
        if (isMountedRef.current) {
          setValidation((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: result.error || result.message || "Failed to reset password",
          }));
        }
      }
    } catch (error) {
      console.error("Password reset failed:", error);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

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
        errorMsg += error.message || "An unexpected error occurred. Please check the backend logs.";
      }

      if (isMountedRef.current) {
        setValidation((prev) => ({
          ...prev,
          isSubmitting: false,
          apiError: errorMsg,
        }));
      }
    }
  };

  const handleSelfPasswordReset = () => {
    if (currentUser) {
      // Create a user object for self-password reset
      const selfUser = {
        id: currentUser.id || 1, // Fallback to 1 if id not available
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
    <div className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Admin Panel" subtitle="Manage users, devices, and system settings" />

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {systemStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="bg-white dark:bg-gray-900">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
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
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "approvals", label: "Pending Approvals", icon: UserCheck },
                { id: "users", label: "Users", icon: Users },
                { id: "password-management", label: "Password Management", icon: Key },
                { id: "settings", label: "Settings", icon: Settings },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
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

        {/* Approvals Tab */}
        {activeTab === "approvals" && <UserApprovalPanel />}

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                User Management
              </h3>
              <button
                onClick={handleAddUser}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add User</span>
              </button>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading users...</p>
                  </div>
                </div>
              ) : usersError ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{usersError}</p>
                    <button
                      onClick={fetchUsers}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-600 dark:text-gray-400">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Company
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Phone
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                            {user.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {user.email}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {user.company}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {user.phone}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                user.status === "Active"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
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
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Role
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
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
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                              {user.name}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {user.email}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => openPasswordResetModal(user)}
                                className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Create New User
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.username}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUserFormData.email}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      value={newUserFormData.password}
                      onChange={(e) =>
                        setNewUserFormData({ ...newUserFormData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      style={{ minHeight: "44px", fontSize: "16px" }}
                      placeholder="Enter password (min 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      style={{ minHeight: "44px", minWidth: "44px" }}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.firstName}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.lastName}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newUserFormData.phoneNumber}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, phoneNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.company}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, company: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.department}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, department: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
                    placeholder="Enter department"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={newUserFormData.position}
                    onChange={(e) =>
                      setNewUserFormData({ ...newUserFormData, position: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    style={{ minHeight: "44px", fontSize: "16px" }}
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
                        setNewUserFormData({ ...newUserFormData, roleId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      style={{ minHeight: "44px", fontSize: "16px" }}
                      disabled={availableRoles.length === 0}
                    >
                      <option value="">
                        {availableRoles.length === 0 ? "Loading roles..." : "Select a role"}
                      </option>
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => setCreateUserModal(false)}
                  disabled={isCreatingUser}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
                  style={{ minHeight: "44px", fontSize: "16px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={isCreatingUser || rolesLoadError || availableRoles.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  style={{ minHeight: "44px", fontSize: "16px" }}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Edit User
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={editingUser.company}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        company: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Operator">Operator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveUser(editingUser)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {passwordResetModal && selectedUserForReset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md"
              data-testid="password-reset-modal"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Reset Password
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Resetting password for:{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedUserForReset.name}
                </span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordFormData.newPassword}
                      onChange={(e) => {
                        const newPassword = e.target.value;
                        setPasswordFormData({ ...passwordFormData, newPassword });
                        // Update validation in real-time on every keystroke
                        validateInRealTime(newPassword, passwordFormData.confirmPassword);
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordFormData.confirmPassword}
                      onChange={(e) => {
                        const newConfirmPassword = e.target.value;
                        setPasswordFormData({
                          ...passwordFormData,
                          confirmPassword: newConfirmPassword,
                        });
                        // Update validation in real-time on every keystroke
                        validateInRealTime(passwordFormData.newPassword, newConfirmPassword);
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

                {/* Single error/warning display with priority:
                    1. API errors (only after validation passes)
                    2. Password length validation (only when typing)
                    3. Password match validation (only when typing confirm)
                */}
                {validation.apiError && (
                  <div
                    className="error-message p-3 bg-red-50 dark:bg-red-900/20 rounded-md"
                    data-testid="password-error"
                    role="alert"
                  >
                    <p className="text-xs text-red-600 dark:text-red-400">{validation.apiError}</p>
                  </div>
                )}

                {shouldShowLengthError() && (
                  <div
                    className="password-warning p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md"
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
                    className="password-warning p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      Passwords do not match
                    </p>
                  </div>
                )}

                {/* Static info banner removed as it was causing confusion - validation is now shown dynamically only */}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
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
                      ? "bg-blue-600 text-white hover:bg-blue-700 active"
                      : "bg-gray-400 text-gray-200"
                  }`}
                >
                  {validation.isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{validation.isSubmitting ? "Resetting..." : "Reset Password"}</span>
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
                  <Button onClick={() => handleToggleSetting("autoBackup")} className="ml-4">
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
                  <Button onClick={() => handleToggleSetting("maintenanceMode")} className="ml-4">
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
