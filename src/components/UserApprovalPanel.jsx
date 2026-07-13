import { Check, RefreshCw, UserCheck, UserX, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  approveUser,
  getPendingUsers,
  getRoles,
  rejectUser,
} from "../services/userService";
import { formatRoleName, formatUserName } from "../utils/userUtils";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// Error boundary wrapper component
const UserApprovalPanelError = ({ error, resetError }) => {
  return (
    <div className="p-6 text-center">
      <div className="text-red-600 dark:text-red-400 mb-4">
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="text-sm mt-1">{error?.message || "Failed to load user approvals"}</p>
      </div>
      <Button onClick={resetError} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
};

const UserApprovalPanel = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [availableRoles, setAvailableRoles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  const fetchPendingUsers = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const result = await getPendingUsers({ per_page: 100 });

      if (result.success) {
        setPendingUsers(result.data || []);
      } else {
        toast.error(result.message || "Failed to fetch pending users");
        setHasError(true);
        setError(new Error(result.message || "Failed to fetch pending users"));
      }
    } catch (err) {
      toast.error("Failed to fetch pending users");
      setHasError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const result = await getRoles();

      if (result.success) {
        setAvailableRoles(result.data || []);
      } else {
        setAvailableRoles([]);
      }
    } catch (_error) {
      setAvailableRoles([]);
    }
  }, []);

  // Fetch pending users on mount
  useEffect(() => {
    fetchPendingUsers();
    fetchRoles();
  }, [fetchPendingUsers, fetchRoles]);

  const handleApproveClick = (user) => {
    if (!user) return;
    setSelectedUser(user);
    setActionType("approve");
    // Pre-select current role if exists
    setSelectedRoleId(user.role?.id?.toString() || "");
  };

  const handleRejectClick = (user) => {
    if (!user) return;
    setSelectedUser(user);
    setActionType("reject");
    setRejectionReason("");
  };

  const handleApproveConfirm = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const roleId = selectedRoleId ? parseInt(selectedRoleId, 10) : null;
      const result = await approveUser(selectedUser.id, roleId);

      if (result.success) {
        toast.success(result.message || "User approved successfully");
        // Remove from pending list
        setPendingUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
        closeDialog();
      } else {
        toast.error(result.message || "Failed to approve user");
      }
    } catch (_error) {
      toast.error("Failed to approve user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const result = await rejectUser(selectedUser.id, rejectionReason);

      if (result.success) {
        toast.success(result.message || "User registration rejected");
        // Remove from pending list
        setPendingUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
        closeDialog();
      } else {
        toast.error(result.message || "Failed to reject user");
      }
    } catch (_error) {
      toast.error("Failed to reject user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setActionType(null);
    setSelectedRoleId("");
    setRejectionReason("");
  };

  const resetError = () => {
    setHasError(false);
    setError(null);
    fetchPendingUsers();
    fetchRoles();
  };

  // If there's an error, show the error UI
  if (hasError) {
    return <UserApprovalPanelError error={error} resetError={resetError} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending User Registrations
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingUsers}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Loading pending users...
              </p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                No pending user registrations
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.map((user) => (
                  <Card key={user.id} className="border shadow-sm">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-lg">
                            {formatUserName(user)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            @{user.username}
                          </p>
                        </div>

                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <span className="font-medium">Email:</span>
                            <span className="text-gray-600 dark:text-gray-400 truncate">
                              {user.email}
                            </span>
                          </p>

                          {user.company && (
                            <p className="flex items-center gap-2">
                              <span className="font-medium">Company:</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {user.company}
                              </span>
                            </p>
                          )}

                          {user.phone_number && (
                            <p className="flex items-center gap-2">
                              <span className="font-medium">Phone:</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {user.phone_number}
                              </span>
                            </p>
                          )}

                          {user.department && (
                            <p className="flex items-center gap-2">
                              <span className="font-medium">Department:</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {user.department}
                              </span>
                            </p>
                          )}

                          {user.position && (
                            <p className="flex items-center gap-2">
                              <span className="font-medium">Position:</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {user.position}
                              </span>
                            </p>
                          )}

                          <p className="flex items-center gap-2">
                            <span className="font-medium">Current Role:</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {formatRoleName(user.role)}
                            </span>
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveClick(user)}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClick(user)}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={actionType === "approve"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User Registration</DialogTitle>
            <DialogDescription>
              Approve {selectedUser && formatUserName(selectedUser)} and assign
              a role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-select">Assign Role</Label>
              {availableRoles && availableRoles.length > 0 ? (
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger id="role-select">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {formatRoleName(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    No roles available. Please create a role first in the system settings.
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {availableRoles && availableRoles.length > 0
                  ? "Select the role to assign to this user"
                  : "Contact an administrator to set up roles"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveConfirm}
              disabled={isSubmitting || !selectedRoleId || (availableRoles && availableRoles.length === 0)}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Approving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Approve User
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Registration</DialogTitle>
            <DialogDescription>
              Reject {selectedUser && formatUserName(selectedUser)}'s
              registration request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason (Optional)</Label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Rejecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Reject User
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserApprovalPanel;
