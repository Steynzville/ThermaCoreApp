import { apiPostJson } from "../utils/apiFetch";
import { finishAuthSession } from "./externalAuthService";
export const encodePasskey = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export const decodePasskey = (value) =>
  Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (character) => character.charCodeAt(0),
  );
function supported() {
  if (
    !window.isSecureContext ||
    !navigator.credentials ||
    !window.PublicKeyCredential
  )
    throw new Error(
      "Passkeys require HTTPS and a browser/device that supports WebAuthn.",
    );
}
function serialize(credential) {
  if (!credential) throw new Error("Passkey authentication was cancelled.");
  const response = {};
  for (const field of [
    "clientDataJSON",
    "attestationObject",
    "authenticatorData",
    "signature",
    "userHandle",
  ]) {
    const value = credential.response[field];
    if (value) response[field] = encodePasskey(value);
  }
  if (credential.response.getTransports)
    response.transports = credential.response.getTransports();
  return {
    id: credential.id,
    rawId: encodePasskey(credential.rawId),
    type: credential.type,
    response,
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
export async function registerPasskey(password, name) {
  supported();
  const { transaction, options } = await apiPostJson(
    "/api/v1/auth/passkeys/register/options",
    { password },
  );
  const publicKey = {
    ...options,
    challenge: decodePasskey(options.challenge),
    user: { ...options.user, id: decodePasskey(options.user.id) },
    excludeCredentials: (options.excludeCredentials || []).map((item) => ({
      ...item,
      id: decodePasskey(item.id),
    })),
  };
  const credential = await navigator.credentials.create({ publicKey });
  return apiPostJson("/api/v1/auth/passkeys/register/verify", {
    transaction,
    name,
    credential: serialize(credential),
  });
}
export async function signInWithPasskey() {
  supported();
  const { transaction, options } = await apiPostJson(
    "/api/v1/auth/passkeys/login/options",
    {},
    { redirectOn401: false },
  );
  const publicKey = {
    ...options,
    challenge: decodePasskey(options.challenge),
    allowCredentials: (options.allowCredentials || []).map((item) => ({
      ...item,
      id: decodePasskey(item.id),
    })),
  };
  const credential = await navigator.credentials.get({ publicKey });
  const result = await apiPostJson(
    "/api/v1/auth/passkeys/login/verify",
    { transaction, credential: serialize(credential) },
    { redirectOn401: false },
  );
  finishAuthSession(result);
}
