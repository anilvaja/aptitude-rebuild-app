import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAccessToken, setOnAuthLost } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnAuthLost(() => setUser(null));
    // Attempt silent refresh on load so a page reload doesn't force re-login.
    api
      .refresh()
      .then((data) => {
        if (data) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    await api.post("/api/auth/register", { name, email, password });
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
