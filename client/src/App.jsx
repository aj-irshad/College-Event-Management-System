import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import authContext from "./context/authContext";

// Auth pages
import Login from "./features/auth/pages/Login";
import Signup from "./features/auth/pages/Signup";
import Resetpassword from "./features/auth/pages/ResetForm";
import VerifyOTP from "./features/auth/pages/VerifyOTP";

// Main layout
import Home from "./home/Home";

// User and shared pages
import UserHome from "./home/components/UserHome";
import Blogs from "./home/components/Blogs";
import UpcomingEvents from "./home/components/UpcomingEvents";
import OngoingEvents from "./home/components/OngoingEvents";
import Feedback from "./home/components/Feedback";
import Polls from "./home/components/Polls";

// Admin pages
import Dashboard from "./features/admin/pages/Dashboard";
import CreateEvent from "./features/admin/pages/events/CreateEvent";

const App = () => {
  const { user, loading, isAdmin } = useContext(authContext);

  // Wait for authentication state
  if (loading) {
    return "Loading...";
  }

  return (
    <Routes>
      // Public auth routes
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route
        path="/verify-otp"
        element={user ? <Navigate to="/" replace /> : <VerifyOTP />}
      />
      // Protected main layout
      <Route
        path="/"
        element={user ? <Home /> : <Navigate to="/login" replace />}
      >
        // Default dashboard
        <Route
          index
          element={
            isAdmin ? <Dashboard user={user} /> : <UserHome user={user} />
          }
        />
        // Admin only
        <Route
          path="create-event"
          element={isAdmin ? <CreateEvent /> : <Navigate to="/" replace />}
        />
        // Shared routes
        <Route path="upcoming-events" element={<UpcomingEvents />} />
        <Route path="ongoing-events" element={<OngoingEvents />} />
        <Route path="blogs" element={<Blogs />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="polls" element={<Polls />} />
      </Route>
      // Account
      <Route
        path="/reset"
        element={user ? <Resetpassword /> : <Navigate to="/login" replace />}
      />
      // Fallback
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
