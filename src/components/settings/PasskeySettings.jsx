import { useEffect, useState } from "react";
import { apiGetJson, apiFetch } from "../../utils/apiFetch";
import { registerPasskey } from "../../services/passkeyService";
import { Button } from "../ui/button";
export default function PasskeySettings({ password }) {
  const [keys, setKeys] = useState([]),
    [name, setName] = useState("My passkey"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [success, setSuccess] = useState("");
  const refresh = async () =>
    setKeys((await apiGetJson("/api/v1/auth/passkeys")).data || []);
  useEffect(() => {
    let alive = true;
    apiGetJson("/api/v1/auth/passkeys")
      .then((result) => {
        if (alive) setKeys(result.data || []);
      })
      .catch((failure) => {
        if (alive) setError(failure.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  const run = async (action, message) => {
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      await action();
      await refresh();
      setSuccess(message);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="border-t pt-4 space-y-3">
      <h4 className="font-semibold">Passkeys / biometric sign-in</h4>
      <p className="text-sm text-muted-foreground">
        Register a passkey using your device's fingerprint, face recognition,
        PIN or security key. Your biometric data stays on your device. Confirm
        your current password above first.
      </p>
      <label htmlFor="passkey-name" className="block">
        Passkey name
      </label>
      <input
        id="passkey-name"
        className="border rounded p-2 bg-background"
        value={name}
        maxLength={100}
        onChange={(event) => setName(event.target.value)}
      />
      <Button
        disabled={busy || !password || !name.trim()}
        onClick={() =>
          run(() => registerPasskey(password, name), "Passkey registered.")
        }
      >
        Register passkey
      </Button>
      <ul>
        {keys.map((key) => (
          <li key={key.id} className="flex items-center justify-between py-2">
            {key.name}
            <Button
              variant="outline"
              disabled={busy || !password}
              onClick={() =>
                run(
                  () =>
                    apiFetch(
                      `/api/v1/auth/passkeys/${encodeURIComponent(key.id)}`,
                      { method: "DELETE", body: JSON.stringify({ password }) },
                    ),
                  "Passkey removed.",
                )
              }
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
