import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";

import authContext from "../context/authContext";

const ProtectedRoute = () => {
  const { user, loading } = useContext(authContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
