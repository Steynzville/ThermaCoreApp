import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiPostJson } from "../utils/apiFetch";
import {
  finishAuthSession,
  finishProviderSignIn,
  startProviderSignIn,
} from "./externalAuthService";
import {
  decodePasskey,
  encodePasskey,
  registerPasskey,
  signInWithPasskey,
} from "./passkeyService";

vi.mock("../utils/apiFetch", () => ({ apiPostJson: vi.fn() }));
let assign, replace, create, get;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  assign = vi.fn();
  replace = vi.fn();
  create = vi.fn();
  get = vi.fn();
  vi.stubGlobal("window", {
    isSecureContext: true,
    PublicKeyCredential: class {},
    location: { assign, replace },
  });
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("navigator", { credentials: { create, get } });
});
afterEach(() => vi.unstubAllGlobals());
it.each(["Google", "Apple"])(
  "starts %s using a real browser verifier and SHA-256 challenge",
  async (provider) => {
    apiPostJson.mockResolvedValue({
      url: "https://provider.example/authorize",
    });
    await startProviderSignIn(provider, true, "current-password");
    const verifier = sessionStorage.getItem("thermacore_oauth_verifier");
    const challenge = Buffer.from(
      await webcrypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier),
      ),
    ).toString("base64url");
    expect(apiPostJson).toHaveBeenCalledWith(
      `/api/v1/auth/oauth/${provider.toLowerCase()}/start`,
      { challenge, link: true, password: "current-password" },
      { redirectOn401: false },
    );
    expect(assign).toHaveBeenCalledWith("https://provider.example/authorize");
  },
);
it("rejects insecure origins and unavailable providers without a fake session", async () => {
  window.isSecureContext = false;
  await expect(startProviderSignIn("Google")).rejects.toThrow("HTTPS");
  expect(apiPostJson).not.toHaveBeenCalled();
  window.isSecureContext = true;
  apiPostJson.mockRejectedValue(new Error("Google is not configured"));
  await expect(startProviderSignIn("Google")).rejects.toThrow("not configured");
  expect(sessionStorage.getItem("thermacore_oauth_verifier")).toBeNull();
  expect(assign).not.toHaveBeenCalled();
});
it("consumes the tab verifier, clears stale identity/tenant state and establishes only the returned session", async () => {
  sessionStorage.setItem("thermacore_oauth_verifier", "verifier");
  localStorage.setItem("thermacore_role", "admin");
  sessionStorage.setItem("tenant_selected", "foreign");
  apiPostJson.mockResolvedValue({ access_token: "verified-token" });
  await finishProviderSignIn("ticket");
  expect(apiPostJson).toHaveBeenCalledWith(
    "/api/v1/auth/oauth/exchange",
    { code: "ticket", verifier: "verifier" },
    { redirectOn401: false },
  );
  expect(sessionStorage.getItem("thermacore_oauth_verifier")).toBeNull();
  expect(localStorage.getItem("thermacore_role")).toBeNull();
  expect(sessionStorage.getItem("tenant_selected")).toBeNull();
  expect(sessionStorage.getItem("thermacore_token")).toBe("verified-token");
  expect(replace).toHaveBeenCalledWith("/dashboard");
  await expect(finishProviderSignIn("ticket")).rejects.toThrow("browser tab");
});
it("returns linked accounts to Settings and rejects missing application tokens", async () => {
  sessionStorage.setItem("thermacore_oauth_verifier", "verifier");
  apiPostJson.mockResolvedValue({ linked: true });
  await finishProviderSignIn("ticket");
  expect(replace).toHaveBeenCalledWith("/settings");
  expect(() => finishAuthSession({})).toThrow("application session");
});
const bytes = Uint8Array.from([0, 255, 128, 42]);
const credential = () => ({
  id: "credential",
  rawId: bytes.buffer,
  type: "public-key",
  getClientExtensionResults: () => ({ credProps: { rk: true } }),
  response: {
    clientDataJSON: bytes.buffer,
    attestationObject: bytes.buffer,
    authenticatorData: bytes.buffer,
    signature: bytes.buffer,
    userHandle: bytes.buffer,
    getTransports: () => ["internal"],
  },
});
it("roundtrips base64url bytes without corrupting WebAuthn binary data", () =>
  expect(decodePasskey(encodePasskey(bytes))).toEqual(bytes));
it("registers a passkey using server challenge/exclusions and serializes the authenticator response", async () => {
  apiPostJson
    .mockResolvedValueOnce({
      transaction: "tx",
      options: {
        challenge: encodePasskey(bytes),
        user: { id: encodePasskey(bytes), name: "Operator" },
        excludeCredentials: [{ id: encodePasskey(bytes), type: "public-key" }],
      },
    })
    .mockResolvedValueOnce({ id: "saved" });
  create.mockResolvedValue(credential());
  expect(await registerPasskey("current-password", "Laptop")).toEqual({
    id: "saved",
  });
  expect(create).toHaveBeenCalledWith({
    publicKey: expect.objectContaining({
      challenge: bytes,
      user: { id: bytes, name: "Operator" },
      excludeCredentials: [{ id: bytes, type: "public-key" }],
    }),
  });
  expect(apiPostJson).toHaveBeenLastCalledWith(
    "/api/v1/auth/passkeys/register/verify",
    expect.objectContaining({
      transaction: "tx",
      name: "Laptop",
      credential: expect.objectContaining({
        rawId: encodePasskey(bytes),
        response: expect.objectContaining({
          transports: ["internal"],
          signature: encodePasskey(bytes),
        }),
      }),
    }),
  );
});
it("signs in with the server challenge and a verified assertion, not local biometrics alone", async () => {
  apiPostJson
    .mockResolvedValueOnce({
      transaction: "login",
      options: {
        challenge: encodePasskey(bytes),
        allowCredentials: [{ id: encodePasskey(bytes), type: "public-key" }],
      },
    })
    .mockResolvedValueOnce({ access_token: "passkey-token" });
  get.mockResolvedValue(credential());
  await signInWithPasskey();
  expect(get).toHaveBeenCalledWith({
    publicKey: {
      challenge: bytes,
      allowCredentials: [{ id: bytes, type: "public-key" }],
    },
  });
  expect(apiPostJson).toHaveBeenLastCalledWith(
    "/api/v1/auth/passkeys/login/verify",
    expect.objectContaining({ transaction: "login" }),
    { redirectOn401: false },
  );
  expect(sessionStorage.getItem("thermacore_token")).toBe("passkey-token");
});
it("handles cancelled authenticators, unsupported browsers and failed verification", async () => {
  apiPostJson.mockResolvedValue({
    transaction: "tx",
    options: { challenge: "AA" },
  });
  get.mockResolvedValue(null);
  await expect(signInWithPasskey()).rejects.toThrow("cancelled");
  expect(replace).not.toHaveBeenCalled();
  get.mockResolvedValue(credential());
  apiPostJson
    .mockResolvedValueOnce({ transaction: "tx", options: { challenge: "AA" } })
    .mockRejectedValueOnce(new Error("Invalid signature"));
  await expect(signInWithPasskey()).rejects.toThrow("Invalid signature");
  expect(replace).not.toHaveBeenCalled();
  window.PublicKeyCredential = null;
  await expect(registerPasskey("password", "key")).rejects.toThrow(
    "supports WebAuthn",
  );
});
