import { apiPostJson } from "../utils/apiFetch";
const encode = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export async function startProviderSignIn(
  provider,
  link = false,
  password = "",
) {
  if (!window.isSecureContext || !crypto.subtle)
    throw new Error("Provider sign-in requires a secure HTTPS connection.");
  const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = encode(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const response = await apiPostJson(
    `/api/v1/auth/oauth/${provider.toLowerCase()}/start`,
    { challenge, link, password },
    { redirectOn401: false },
  );
  sessionStorage.setItem("thermacore_oauth_verifier", verifier);
  window.location.assign(response.url);
}
export async function finishProviderSignIn(code) {
  const verifier = sessionStorage.getItem("thermacore_oauth_verifier");
  sessionStorage.removeItem("thermacore_oauth_verifier");
  if (!verifier)
    throw new Error(
      "This sign-in did not originate in this browser tab. Please start again.",
    );
  const result = await apiPostJson(
    "/api/v1/auth/oauth/exchange",
    { code, verifier },
    { redirectOn401: false },
  );
  if (result.linked) {
    window.location.replace("/settings");
    return;
  }
  if (!result.access_token)
    throw new Error("Provider sign-in did not return an application session.");
  for (const storage of [localStorage, sessionStorage])
    for (const key of [
      "thermacore_token",
      "thermacore_user",
      "thermacore_role",
      "thermacore_backend_role",
      "authToken",
      "auth_token",
    ])
      storage.removeItem(key);
  sessionStorage.setItem("thermacore_token", result.access_token);
  sessionStorage.removeItem("tenant_selected");
  window.location.replace("/dashboard");
}
