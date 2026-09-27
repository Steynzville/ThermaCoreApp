import { useState } from "react";
import { apiPostJson } from "../../utils/apiFetch";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
export default function PasswordSettings() {
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage("");
    if (password.length < 12 || password !== confirmation) {
      setError("Use at least 12 characters and matching confirmation.");
      return;
    }
    setBusy(true);
    try {
      await apiPostJson(
        "/api/v1/auth/change-password",
        { current_password: current, new_password: password },
        { redirectOn401: false },
      );
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setMessage("Password changed.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle>Change my password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {[
            [
              "current-account-password",
              "Current password",
              current,
              setCurrent,
            ],
            ["new-account-password", "New password", password, setPassword],
            [
              "confirm-account-password",
              "Confirm new password",
              confirmation,
              setConfirmation,
            ],
          ].map(([id, label, value, setter]) => (
            <div key={id}>
              <label className="block text-sm font-medium mb-2" htmlFor={id}>
                {label}
              </label>
              <input
                id={id}
                required
                type="password"
                autoComplete={
                  id === "current-account-password"
                    ? "current-password"
                    : "new-password"
                }
                className="w-full border rounded p-2 bg-background"
                value={value}
                onChange={(event) => setter(event.target.value)}
              />
            </div>
          ))}
          <Button disabled={busy} type="submit">
            Change password
          </Button>
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
