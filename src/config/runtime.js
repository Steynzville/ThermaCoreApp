// Demo-App defaults to a demonstrator. Live deployments explicitly select live.
export const DATA_MODE =
  import.meta.env.VITE_DATA_MODE ||
  (import.meta.env.VITE_MOCK_MODE === "false" ? "live" : "demo");
export const isDemoMode = DATA_MODE === "demo";
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com"
).replace(/\/$/, "");
export const apiUrl = (path) =>
  /^https?:\/\//.test(path)
    ? path
    : `${API_BASE_URL}/${path.replace(/^\//, "")}`;
