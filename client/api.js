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

export default api;
