import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import authContext from "./context/authContext";

import Home from "./home/Home";
import Login from "./auth/Login/Login";
import Signup from "./auth/signup/Signup";
import Resetpassword from "./auth/reset/Resetpassword";
import Logout from "./auth/Logout/Logout";
import VerifyOTP from "./auth/VerifyOTP/VerifyOTP";

import Blogs from "./home/components/Blogs";
import UpcomingEvents from "./home/components/UpcomingEvents";
import OngoingEvents from "./home/components/OngoingEvents";
import Feedback from "./home/components/Feedback";
import Polls from "./home/components/Polls";
import Dashboard from "./home/components/Dashboard";

const App = () => {
  const { user, loading } = useContext(authContext);

  if (loading) return <h2>Loading...</h2>;

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route path="/verify-otp" element={<VerifyOTP />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={user ? <Home /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Dashboard />} />
        <Route element={<UpcomingEvents />} />
        <Route path="upcoming-events" element={<UpcomingEvents />} />
        <Route path="ongoing-events" element={<OngoingEvents />} />
        <Route path="blogs" element={<Blogs />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="polls" element={<Polls />} />
      </Route>

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
