import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";

import authContext from "../context/authContext";

const AdminRoute = () => {
  const { isAdmin, loading } = useContext(authContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;
