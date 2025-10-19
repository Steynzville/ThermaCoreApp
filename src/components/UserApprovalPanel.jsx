import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UserApprovalPanel = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    fetchPendingUsers();
    fetchRoles();
  }, []);

  const fetchPendingUsers = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_BASE_URL}/api/v1/users/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending users");
      }

      const data = await response.json();
      setPendingUsers(data.data || []);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      toast.error("Failed to load pending users");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_BASE_URL}/api/v1/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }

      const data = await response.json();
      setAvailableRoles(data.data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setAvailableRoles([
        { id: 1, name: "admin", description: "Administrator" },
        { id: 2, name: "operator", description: "Operator" },
        { id: 3, name: "viewer", description: "Viewer" },
      ]);
    }
  };

  const handleApprove = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_BASE_URL}/api/v1/users/${selectedUser.id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role_id: Number.parseInt(selectedRole),
          notes: approvalNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve user");
      }

      toast.success(`User ${selectedUser.username} approved successfully`);
      setShowApproveDialog(false);
      setSelectedUser(null);
      setSelectedRole("");
      setApprovalNotes("");
      fetchPendingUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error(error.message || "Failed to approve user");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_BASE_URL}/api/v1/users/${selectedUser.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject user");
      }

      toast.success(`User ${selectedUser.username} registration rejected`);
      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectionReason("");
      fetchPendingUsers();
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error(error.message || "Failed to reject user");
    }
  };

  const openApproveDialog = (user) => {
    setSelectedUser(user);
    setShowApproveDialog(true);
  };

  const openRejectDialog = (user) => {
    setSelectedUser(user);
    setShowRejectDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Pending User Approvals</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>No pending user registrations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Pending User Approvals ({pendingUsers.length})</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Username</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Company</th>
                  <th className="text-left p-3">Registered</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3">{user.username}</td>
                    <td className="p-3">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{user.company || "N/A"}</td>
                    <td className="p-3">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => openApproveDialog(user)}
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => openRejectDialog(user)}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User Registration</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.username} and approve their registration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Role <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Choose a role...</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Approval Notes (Optional)</label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows="3"
                placeholder="Add any notes about this approval..."
              />
            </div>

            {selectedUser && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm">
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>Name:</strong> {selectedUser.first_name} {selectedUser.last_name}
                </p>
                <p>
                  <strong>Company:</strong> {selectedUser.company || "N/A"}
                </p>
                <p>
                  <strong>Department:</strong> {selectedUser.department || "N/A"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setSelectedRole("");
                setApprovalNotes("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              Approve User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedUser?.username}'s registration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows="4"
                placeholder="Explain why this registration is being rejected..."
              />
            </div>

            {selectedUser && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm">
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>Name:</strong> {selectedUser.first_name} {selectedUser.last_name}
                </p>
                <p>
                  <strong>Company:</strong> {selectedUser.company || "N/A"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleReject} variant="destructive">
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserApprovalPanel;
