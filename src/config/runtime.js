import deployment from "./deployment.json";

// Branch deployment configuration is explicit; absent configuration is live.
export const DATA_MODE =
  import.meta.env.VITE_DATA_MODE || deployment.dataMode || "live";
if (!["demo", "live"].includes(DATA_MODE))
  throw new Error("VITE_DATA_MODE must be demo or live");
export const isDemoMode = DATA_MODE === "demo";
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com"
).replace(/\/$/, "");
export const apiUrl = (path) =>
  /^https?:\/\//.test(path)
    ? path
    : `${API_BASE_URL}/${path.replace(/^\//, "")}`;
