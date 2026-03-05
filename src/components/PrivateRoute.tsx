import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface PrivateRouteProps {
  allowedRoles?: string[];
}

export default function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (location.pathname === "/") {
    if (["student"].includes(user.role)) {
      return <Navigate to="/class-logger" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}