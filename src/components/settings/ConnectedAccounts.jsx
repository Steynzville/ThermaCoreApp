import { useEffect, useState } from "react";
import { apiGetJson } from "../../utils/apiFetch";
import { startProviderSignIn } from "../../services/externalAuthService";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import PasskeySettings from "./PasskeySettings";
export default function ConnectedAccounts() {
  const [password, setPassword] = useState("");
  const [linked, setLinked] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    apiGetJson("/api/v1/auth/oauth/identities")
      .then((result) => {
        if (alive) setLinked(result.providers);
      })
      .catch((failure) => {
        if (alive) setError(failure.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  const connect = async (provider) => {
    setBusy(true);
    setError(null);
    try {
      await startProviderSignIn(provider, true, password);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle>Connected sign-in accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Confirm your current password, then authorize Google or Apple to sign
          in to this account. Linking never changes your role or portfolio.
        </p>
        <label className="block" htmlFor="link-password">
          Current password
        </label>
        <input
          id="link-password"
          type="password"
          autoComplete="current-password"
          className="border rounded p-2 bg-background"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex gap-3">
          {["google", "apple"].map((provider) => (
            <Button
              key={provider}
              disabled={busy || !password}
              onClick={() => connect(provider)}
            >
              {linked.includes(provider) ? "Link another" : "Link"}{" "}
              {provider === "google" ? "Google" : "Apple"}
            </Button>
          ))}
        </div>
        {linked.length > 0 && <p>Connected: {linked.join(", ")}</p>}
        {error && <p role="alert">{error}</p>}
        <PasskeySettings password={password} />
      </CardContent>
    </Card>
  );
}
