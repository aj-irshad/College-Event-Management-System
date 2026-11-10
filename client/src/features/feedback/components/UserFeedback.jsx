import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { fetchFeedbackForm } from "../../../services/feedbackService";
import socket from "../../../api/socket";
import { EmptyState, PageHeader } from "../../../components/ModulePageUI";
import FeedbackCard from "./FeedbackCard";
import "../styles/userFeedback.css";

const UserFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const revisionRef = useRef(0);
  const { formId } = useParams();
  const navigate = useNavigate();

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
    navigate("/feedback", { replace: true });
  };

  const selectedForm = formId ? feedbacks.find((form) => form._id === formId) : null;

  return (
    <section className="feedbackPage">
      <PageHeader title="Event Feedback" description="Share your thoughts about completed events." />
      {notice && <p className="feedback-submit-success" role="status">{notice}</p>}
      {error && <p className="feedback-page-error" role="alert">{error}</p>}
      {loading ? <p className="feedback-page-state" role="status">Loading eligible forms…</p> : feedbacks.length > 0 ? (
        formId ? selectedForm && !selectedForm.hasSubmitted ? (
          <div className="feedbackContainer">
            <Link to="/feedback" className="feedback-submit-button">Back to feedback forms</Link>
            <FeedbackCard key={selectedForm._id} feedback={selectedForm} onSubmitted={handleSubmitted} />
          </div>
        ) : <p className="feedback-page-state">This form is no longer available or has already been submitted.</p> : (
          <div className="feedback-listing">
            {feedbacks.map((feedback) => (
              <article className="feedbackCard" key={feedback._id}>
                <header className="feedbackCardHeader">
                  <span>{feedback.event?.event_type || "Completed event"} · {feedback.event?.title || "Event"}</span>
                  <h2>{feedback.title}</h2>
                  {feedback.description && <p>{feedback.description}</p>}
                </header>
                <p>{feedback.questions?.length || 0} questions · Closes {new Date(feedback.endsAt).toLocaleString()}</p>
                <p role="status">{feedback.hasSubmitted ? "Submitted" : "Available · Not submitted"}</p>
                {!feedback.hasSubmitted && <button className="feedback-submit-button" type="button" onClick={() => navigate(`/feedback/forms/${feedback._id}`)}>Open form</button>}
              </article>
            ))}
          </div>
        )
      ) : error ? null : (
        <EmptyState
          icon={MessageSquare}
          title="No feedback forms"
          description="There are no feedback forms available for completed events right now. Check back later."
        />
      )}
    </section>
  );
};

export default UserFeedback;
