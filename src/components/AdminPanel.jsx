import {
  Database,
  Edit,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import React, { useState } from "react";

import PageHeader from "./PageHeader";
import { Button } from "./ui/button";
import { Card, CardContent,CardHeader } from "./ui/card";

const initialUsers = [
  {
    id: 1,
    name: "John Doe",
    email: "john@thermacore.com",
    company: "ThermaCore Industries",
    phone: "+1 (555) 123-4567",
    role: "Admin",
    status: "Active",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@thermacore.com",
    company: "Energy Solutions Ltd",
    phone: "+1 (555) 987-6543",
    role: "Operator",
    status: "Active",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@thermacore.com",
    company: "Green Power Corp",
    phone: "+1 (555) 456-7890",
    role: "Viewer",
    status: "Inactive",
  },
];

const systemStats = [
  { label: "Total Devices", value: "4", icon: Database },
  { label: "Active Users", value: "2", icon: Users },
  { label: "System Uptime", value: "99.9%", icon: Shield },
  { label: "Data Points", value: "1.2M", icon: Settings },
];

const AdminPanel = ({ className }) => {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState(null);
  const [systemSettings, setSystemSettings] = useState({
    emailNotifications: true,
    autoBackup: true,
    maintenanceMode: false,
  });

  const handleAddUser = () => {
    const name = prompt("Enter user's full name:");
    const email = prompt("Enter user's email:");
    const company = prompt("Enter user's company:");
    const phone = prompt("Enter user's phone number:");
    if (name && email && company && phone) {
      const newUser = {
        id: users.length + 1,
        name,
        email,
        company,
        phone,
        role: "Viewer",
        status: "Active",
      };
      setUsers([...users, newUser]);
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

  const handleDeleteUser = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter((user) => user.id !== userId));
    }
  };

  const handleToggleSetting = (setting) => {
    setSystemSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
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
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "users", label: "Users", icon: Users },
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
            </CardContent>
          </Card>
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
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, name: e.target.value })
                    }
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
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
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
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value })
                    }
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
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, status: e.target.value })
                    }
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
                  <Button
                    onClick={() => handleToggleSetting("autoBackup")}
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
