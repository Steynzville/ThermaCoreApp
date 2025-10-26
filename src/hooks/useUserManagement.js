/**
 * useUserManagement Hook
 *
 * Manages user CRUD operations, user list fetching, and user state.
 * Extracted from AdminPanel to improve testability.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteUser, getAllUsers } from "../services/usersAPI";
import { apiGet, apiPost } from "../utils/apiFetch";
import { formatRoleName, formatUserName } from "../utils/userUtils";

export const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

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

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError(null);

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

  // Fetch users on hook mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
  };

  const handleSaveUser = (updatedUser) => {
    setUsers(
      users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );
    setEditingUser(null);
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

  return {
    // User state
    users,
    isLoadingUsers,
    usersError,
    editingUser,

    // User creation modal state
    createUserModal,
    newUserFormData,
    availableRoles,
    showCreatePassword,
    isCreatingUser,
    rolesLoadError,

    // User actions
    fetchUsers,
    handleAddUser,
    handleCreateUser,
    handleEditUser,
    handleSaveUser,
    handleDeleteUser,

    // User form state setters
    setCreateUserModal,
    setNewUserFormData,
    setShowCreatePassword,
    setEditingUser,
  };
};
