import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";

import authContext from "../context/authContext";

const PublicRoute = () => {
  const { user, loading } = useContext(authContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <Navigate to="/" replace /> : <Outlet />;
};

export default PublicRoute;
