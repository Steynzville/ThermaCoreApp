import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiGetJson, apiPutJson, apiFetch } from "../../utils/apiFetch";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
export default function ProfileSettings() {
  const { updateAccountProfile } = useAuth();
  const [profile, setProfile] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    apiGetJson("/api/v1/account/settings")
      .then((result) => {
        if (alive) setProfile(result.profile);
      })
      .catch((failure) => {
        if (alive) setError(failure.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  const run = async (action) => {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await action();
      setProfile(result.profile);
      updateAccountProfile?.(result.profile);
      setMessage("Profile saved.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  const save = (event) => {
    event.preventDefault();
    const { username, firstName, lastName, displayName } = profile;
    run(() =>
      apiPutJson("/api/v1/account/settings", {
        profile: { username, firstName, lastName, displayName },
      }),
    );
  };
  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile images must be at most 2 MB.");
      return;
    }
    const body = new FormData();
    body.append("avatar", file);
    run(async () =>
      (
        await apiFetch("/api/v1/account/avatar", { method: "POST", body })
      ).json(),
    );
    event.target.value = "";
  };
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center space-x-2">
        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Profile
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile && (
          <form onSubmit={save} className="space-y-4">
            {profile.avatarDataUrl && (
              <img
                src={profile.avatarDataUrl}
                alt="Your profile"
                className="w-20 h-20 rounded-full object-cover"
              />
            )}
            <label htmlFor="profile-avatar" className="block">
              Profile picture (PNG, JPEG or WebP; up to 2 MB)
            </label>
            <input
              id="profile-avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={upload}
            />
            {profile.avatarDataUrl && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () =>
                    (
                      await apiFetch("/api/v1/account/avatar", {
                        method: "DELETE",
                      })
                    ).json(),
                  )
                }
              >
                Remove picture
              </Button>
            )}
            {[
              ["username", "Username"],
              ["firstName", "First name"],
              ["lastName", "Last name"],
              ["displayName", "Display name"],
            ].map(([key, label]) => (
              <div key={key}>
                <label
                  htmlFor={`profile-${key}`}
                  className="block text-sm font-medium mb-2"
                >
                  {label}
                </label>
                <input
                  id={`profile-${key}`}
                  value={profile[key] || ""}
                  maxLength={key === "username" ? 80 : 100}
                  required={key === "username"}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
            ))}
            <div>
              <label
                htmlFor="profile-email"
                className="block text-sm font-medium mb-2"
              >
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email || ""}
                readOnly
                className="w-full p-2 border rounded-lg bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact your administrator to change the account email.
              </p>
            </div>
            <Button disabled={busy} type="submit">
              Save profile
            </Button>
          </form>
        )}
        {!profile && !error && <p role="status">Loading profile…</p>}
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </CardContent>
    </Card>
  );
}
