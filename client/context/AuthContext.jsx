import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = still loading
  const [token,   setToken]   = useState(null);
  const [photoSessionReady, setPhotoSessionReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      if (u) {
        // Get a fresh ID token — auto-refreshes before expiry
        const t = await u.getIdToken();
        setToken(t);
      } else {
        setToken(null);
      }
    });
    return unsub;
  }, []);

  // Keep token fresh — Firebase tokens expire after 1 hour
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const t = await user.getIdToken(/* forceRefresh */ true);
      setToken(t);
    }, 55 * 60 * 1000); // refresh every 55 min
    return () => clearInterval(interval);
  }, [user]);

  // Mirror the ID token into the httpOnly cookie that authorizes /proxy images
  useEffect(() => {
    if (user === undefined) return;
    if (!token) {
      setPhotoSessionReady(true);
      return;
    }
    fetch("/api/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      .finally(() => setPhotoSessionReady(true));
  }, [user, token]);

  async function logout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    await signOut(auth);
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, logout, photoSessionReady, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
