import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import authContext from "./context/authContext";

import Home from "./home/Home";
import Login from "./auth/Login/Login";
import Signup from "./auth/signup/Signup";
import Resetpassword from "./auth/reset/Resetpassword";
import Logout from "./auth/Logout/Logout";
import VerifyOTP from "./auth/VerifyOTP/VerifyOTP";

const App = () => {
  const { user, loading } = useContext(authContext);

  if (loading) {
    return <h2>Loading...</h2>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Home /> : <Navigate to="/login" replace />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />

      <Route
        path="/reset"
        element={user ? <Resetpassword /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/logout"
        element={user ? <Logout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
};

export default App;
