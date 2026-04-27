import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div id="loading-container">
        <div className="loading-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}

