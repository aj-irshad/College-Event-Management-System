import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFeedbackForm } from "../../../services/feedbackService";
import socket from "../../../api/socket";
import FeedbackCard from "./FeedbackCard";
import "../styles/userFeedback.css";

const UserFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const revisionRef = useRef(0);

  const loadFeedback = useCallback(async () => {
    const revision = revisionRef.current;
    try {
      const response = await fetchFeedbackForm();
      if (revisionRef.current === revision) {
        setFeedbacks(response.data.feedback || []);
        setError("");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load eligible feedback forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeedback();
    const refresh = () => {
      revisionRef.current += 1;
      void loadFeedback();
    };
    const removeForm = ({ _id } = {}) => {
      revisionRef.current += 1;
      if (_id) setFeedbacks((current) => current.filter((form) => form._id !== _id));
      else refresh();
    };
    socket.on("feedback:created", refresh);
    socket.on("feedback:updated", refresh);
    socket.on("feedback:deleted", removeForm);
    socket.on("events:updated", refresh);
    socket.on("events:statuses-updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("feedback:created", refresh);
      socket.off("feedback:updated", refresh);
      socket.off("feedback:deleted", removeForm);
      socket.off("events:updated", refresh);
      socket.off("events:statuses-updated", refresh);
      socket.off("connect", refresh);
    };
  }, [loadFeedback]);

  useEffect(() => {
    if (!feedbacks.length) return undefined;
    const nearestExpiry = Math.min(...feedbacks.map((form) => new Date(form.endsAt).getTime()).filter(Number.isFinite));
    if (!Number.isFinite(nearestExpiry)) return undefined;
    const maxTimerDelay = 2 ** 31 - 1;
    const timer = window.setTimeout(() => {
      revisionRef.current += 1;
      void loadFeedback();
    }, Math.max(100, Math.min(nearestExpiry - Date.now() + 100, maxTimerDelay)));
    return () => window.clearTimeout(timer);
  }, [feedbacks, loadFeedback]);

  const handleSubmitted = (feedbackId, eventId) => {
    revisionRef.current += 1;
    setFeedbacks((current) => current.filter((form) =>
      form._id !== feedbackId && String(form.event?._id) !== String(eventId),
    ));
    setNotice("Your feedback was submitted successfully.");
  };

  return (
    <section className="feedbackPage">
      <h1>Event Feedback</h1>
      <p className="feedback-page-intro">Share your thoughts about completed events.</p>
      {notice && <p className="feedback-submit-success" role="status">{notice}</p>}
      {error && <p className="feedback-page-error" role="alert">{error}</p>}
      {loading ? <p className="feedback-page-state" role="status">Loading eligible forms…</p> : feedbacks.length > 0 ? (
        <div className="feedbackContainer">
          {feedbacks.map((feedback) => <FeedbackCard key={feedback._id} feedback={feedback} onSubmitted={handleSubmitted} />)}
        </div>
      ) : (
        <section className="empty-admin-feedback"><div className="empty-admin-feedback-icon">✦</div><h2>No feedback forms are open</h2><p>Published forms are available for completed events during their open dates.</p></section>
      )}
    </section>
  );
};

export default UserFeedback;
