import axios from "axios";

const API_BASE_URL = "https://thermacoreapp.onrender.com/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Add this function
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("authToken", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("authToken");
  }
};

// Initialize token on load - check all possible token storage locations
const savedToken =
  localStorage.getItem("authToken") ||
  localStorage.getItem("thermacore_token") ||
  sessionStorage.getItem("thermacore_token");
if (savedToken) {
  setAuthToken(savedToken);
}

// Keep existing interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
