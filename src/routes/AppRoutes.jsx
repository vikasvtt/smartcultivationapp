import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import DeviceConfig from "../pages/Deviceconfig";
import History from "../pages/History";
import Evidence from "../pages/Evidence";


// Redirects to /login if user is not logged in
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<Home />} />
      <Route path="/login"     element={<Login />} />
      <Route path="/signup"    element={<Signup />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute><History /></ProtectedRoute>
      } />
      <Route path="/evidence" element={
        <ProtectedRoute><Evidence /></ProtectedRoute>
      } />
      <Route path="/config" element={
        <ProtectedRoute><DeviceConfig /></ProtectedRoute>
        } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
