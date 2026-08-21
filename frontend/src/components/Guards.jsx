import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: "3em", textAlign: "center" }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: "3em", textAlign: "center" }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}
