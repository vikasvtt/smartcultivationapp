// ── src/context/AuthContext.jsx ──────────────────────────────────────
import { createContext, useContext, useState } from "react";
import { apiLogin, apiSignup } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [error, setError] = useState("");

  const login = async (email, password) => {
    try {
      setError("");
      const userData = await apiLogin(email, password);
      setUser(userData); // { id, name, email, role, deviceId }
      return true;
    } catch (err) {
      setError(err.message || "Login failed");
      return false;
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      setError("");
      const userData = await apiSignup(name, email, password, role);
      setUser(userData);
      return true;
    } catch (err) {
      setError(err.message || "Signup failed");
      return false;
    }
  };

  const logout = () => { setUser(null); setError(""); };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);