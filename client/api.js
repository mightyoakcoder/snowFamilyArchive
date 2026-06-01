import axios from "axios";
import { auth } from "./firebase.js";

// Shared axios instance used by all components.
// Before every request, attaches the current Firebase ID token as a Bearer header.
const api = axios.create();

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retried) {
      err.config._retried = true;
      try {
        const token = await auth.currentUser?.getIdToken(true);
        if (token) {
          err.config.headers.Authorization = `Bearer ${token}`;
          return api(err.config);
        }
      } catch {}
      await auth.signOut();
    }
    return Promise.reject(err);
  }
);

export default api;
