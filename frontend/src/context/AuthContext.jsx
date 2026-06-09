import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "token";

const getToken = () => sessionStorage.getItem(TOKEN_KEY);

const setToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
};

const clearToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      localStorage.removeItem(TOKEN_KEY);

      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
      } catch (error) {
        clearToken();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (identifier, password, mode = "staff") => {
    const endpoint = mode === "student" ? "/auth/student-login" : "/auth/staff-login";
    const payload = mode === "student" ? { universityId: identifier, password } : { identifier, password };
    const response = await api.post(endpoint, payload);
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data.user;
  };

  const changePassword = async (payload) => {
    const response = await api.patch("/users/me/password", payload);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, changePassword, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
