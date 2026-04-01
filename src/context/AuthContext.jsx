import { createContext, useContext, useState, useEffect } from "react";
import { apiLogin, apiSignup } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (saved && token) setUser(JSON.parse(saved));
    } catch (_) {}
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError("");
      const data = await apiLogin(email, password);
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

     

      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message || "Login failed");
      return false;
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      setError("");
      const data = await apiSignup(name, email, password, role);
      // ✅ Save token from signup too
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message || "Signup failed");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setError("");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, error, setError, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);