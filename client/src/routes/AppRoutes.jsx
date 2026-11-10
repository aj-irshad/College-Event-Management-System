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
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import CompletePasswordReset from "../features/auth/pages/CompletePasswordReset";

// Main Layout
import Home from "../layout/Home";

// Admin
import CreateEvent from "../features/events/pages/CreateEvent";
import EditBlog from "../features/blogs/pages/EditBlog";
import EditEvent from "../features/events/pages/EditEvent";
import CreatePoll from "../features/polls/pages/CreatePoll";
import EditPoll from "../features/polls/pages/EditPoll";
import PostBlog from "../features/blogs/pages/PostBlog";
import CreateFeedback from "../features/feedback/pages/CreateFeedback";
import FeedbackForms from "../features/feedback/pages/FeedbackForm";

// Dashboard
import AdminDashboard from "../features/dashboard/pages/AdminDashboard";
import UserDashboard from "../features/dashboard/pages/UserDashboard";

// Home Components
import UpcomingEvents from "../features/events/pages/UpcomingEvents";
import OngoingEvents from "../features/events/pages/OngoingEvents";
import CompletedEvent from "../features/events/pages/CompletedEvent";
import Blogs from "../features/blogs/pages/Blogs";
import BlogPage from "../features/blogs/pages/BlogPage";
import Feedback from "../features/feedback/pages/Feedback";
import Polls from "../features/polls/pages/Polls";

// Context
import authContext from "../context/authContext";
import ParticipateEvent from "../features/events/pages/ParticipateEvent";
import SearchPage from "../components/pages/SearchPage";
import UserParticipants from "../features/particiants/pages/UserParticipants";
import AdminParticipants from "../features/particiants/pages/AdminParticipants";
import MyPayments from "../features/payments/pages/MyPayments";
import AdminPayments from "../features/payments/pages/AdminPayments";

const AppRoutes = () => {
  const { user, isAdmin } = useContext(authContext);

  return (
    <Routes>
      {/* Password recovery links remain usable even if an old session exists. */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<CompletePasswordReset />} />

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
          <Route path="/search" element={<SearchPage />} />
          <Route path="upcoming-events" element={<UpcomingEvents />} />
          <Route path="ongoing-events" element={<OngoingEvents />} />
          <Route path="completed-events" element={<CompletedEvent />} />
          <Route path="blogs" element={<Blogs />} />
          <Route path="blogs/:id" element={<BlogPage />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="polls" element={<Polls />} />
          <Route path="/participate/:eventId" element={<ParticipateEvent />} />
          <Route
            path="/participations"
            element={isAdmin ? <AdminParticipants /> : <UserParticipants />}
          />
          <Route path="/payment-submissions" element={<MyPayments />} />

          {/*  ADMIN ROUTES  */}
          <Route element={<AdminRoute />}>
            <Route path="admin/payments" element={<AdminPayments />} />
            <Route path="create-event" element={<CreateEvent />} />
            <Route path="/edit-event/:id" element={<EditEvent />} />
            <Route path="/post-blog" element={<PostBlog />} />
            <Route path="/edit-blog/:id" element={<EditBlog />} />
            <Route path="/feedback/create" element={<CreateFeedback />} />
            <Route path="/feedback/forms/:formId/edit" element={<CreateFeedback />} />
            <Route path="/feedback/:eventId" element={<CreateFeedback />} />
            <Route path="/feedback-forms" element={<FeedbackForms />} />
            <Route path="/create-poll" element={<CreatePoll />} />
            <Route path="/edit-poll/:pollId" element={<EditPoll />} />
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
