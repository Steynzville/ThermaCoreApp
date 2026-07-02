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

  const [passwordResetModal, setPasswordResetModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [validation, setValidation] = useState({
    isValidLength: false,
    passwordsMatch: false,
    isSubmitting: false,
  });

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const result = await getAllUsers({ per_page: 100 });
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

  const fetchRoles = async () => {
    try {
      const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) 
        ? import.meta.env.VITE_API_BASE_URL 
        : "https://thermacoreapp.onrender.com";

      const response = await apiGet(`${API_BASE_URL}/api/v1/roles`, {
        showToastOnError: false,
      });

      if (response && response.ok) {
        const data = await response.json();
        const rolesArray = (data.roles && Array.isArray(data.roles)) ? data.roles : (Array.isArray(data) ? data : []);
        
        if (rolesArray.length > 0) {
          setAvailableRoles(rolesArray);
          setRolesLoadError(false);
        } else {
          setRolesLoadError(true);
        }
      } else {
        setRolesLoadError(true);
      }
    } catch (_error) {
      setRolesLoadError(true);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = () => {
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
    if (availableRoles.length === 0 || rolesLoadError) {
      fetchRoles();
    }
  };

  const handleCreateUser = async () => {
    if (!newUserFormData.username || !newUserFormData.email || !newUserFormData.password || !newUserFormData.roleId) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (rolesLoadError) {
      toast.error("Unable to create user. Please refresh the page.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) 
        ? import.meta.env.VITE_API_BASE_URL 
        : "https://thermacoreapp.onrender.com";

      const response = await apiPost(`${API_BASE_URL}/api/v1/auth/register`, newUserFormData, { showToastOnError: false });
      if (response.ok) {
        toast.success("User created successfully");
        setCreateUserModal(false);
        await fetchUsers();
      } else {
        toast.error("Failed to create user");
      }
    } catch (error) {
      toast.error("Connection error");
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Admin Panel" subtitle="Manage users and system settings" />
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {systemStats.map((stat) => (
            <Card key={stat.label} className="bg-white dark:bg-gray-900">
              <CardContent className="p-4">
                <p className="text-xs text-gray-600">{stat.label}</p>
                <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab Logic ... (Component body remains consistent with your original structure) */}
        {activeTab === "users" && (
            <Card className="bg-white dark:bg-gray-900">
                <CardHeader className="flex flex-row items-center justify-between">
                    <h3 className="text-lg font-semibold">User Management</h3>
                    <button type="button" onClick={handleAddUser} className="px-3 py-2 bg-blue-600 text-white rounded-lg">Add User</button>
                </CardHeader>
                <CardContent>
                    {/* Render User Table */}
                </CardContent>
            </Card>
        )}

        {/* Modals and other tabs omitted for brevity, maintain your original markup */}
      </div>
    </div>
  );
};

export default AdminPanel;
