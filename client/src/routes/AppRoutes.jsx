import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

// Route Guards
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import AdminRoute from "./AdminRoute";

// Auth
import Login from "../features/auth/pages/Login";
import Signup from "../features/auth/pages/Signup";
import ResetForm from "../features/auth/pages/ResetForm";
import VerifyOTP from "../features/auth/pages/VerifyOTP";

// Main Layout
import Home from "../layout/Home";

// User

// Admin
import CreateEvent from "../features/admin/pages/events/CreateEvent";

// Dashboard
import AdminDashboard from "../features/dashboard/pages/AdminDashboard";
import UserDashboard from "../features/dashboard/pages/UserDashboard";

// Home Components
import Blogs from "../features/blogs/Blogs";
import UpcomingEvents from "../features/events/pages/UpcomingEvents";
import OngoingEvents from "../features/events/pages/OngoingEvents";
import Feedback from "../features/feedback/Feedback";
import Polls from "../features/polls/Polls";

// Context
import authContext from "../context/authContext";

const AppRoutes = () => {
  const { user, isAdmin } = useContext(authContext);

  return (
    <Routes>
      {/*  PUBLIC ROUTES  */}

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
      </Route>

      {/*  PROTECTED ROUTES  */}

      <Route element={<ProtectedRoute />}>
        {/* Main Application Layout */}
        <Route path="/" element={<Home />}>
          {/* Dashboard */}
          <Route
            index
            element={
              isAdmin ? (
                <AdminDashboard user={user} />
              ) : (
                <UserDashboard user={user} />
              )
            }
          />

          {/*  USER / COMMON ROUTES  */}

          <Route path="upcoming-events" element={<UpcomingEvents />} />

          <Route path="ongoing-events" element={<OngoingEvents />} />

          <Route path="blogs" element={<Blogs />} />

          <Route path="feedback" element={<Feedback />} />

          <Route path="polls" element={<Polls />} />

          {/*  ADMIN ROUTES  */}

          <Route element={<AdminRoute />}>
            <Route path="create-event" element={<CreateEvent />} />
          </Route>
        </Route>

        {/* Reset Password */}
        <Route path="/reset" element={<ResetForm />} />
      </Route>

      {/*  FALLBACK  */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
