import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, User, CalendarDays, MessageSquare, Plus } from "lucide-react";

import { fetchAllFeedback } from "../../../services/feedbackService";
import socket from "../../../api/socket";
import { EmptyState, PageHeader } from "../../../components/ModulePageUI";
import "../styles/adminFeedback.css";

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const pageHeader = (
    <PageHeader
      title="Feedback"
      description="View feedback submitted by users for college events."
      actionLabel="Create feedback"
      actionIcon={<Plus size={18} />}
      onAction={() => navigate("/feedback/create")}
    />
  );

  const loadFeedback = useCallback(async () => {
    try {
      const response = await fetchAllFeedback();
      setFeedbacks(response.data.feedback || []);
      setError("");
    } catch (error) {
      console.error("Error fetching feedback:", error);
      setError("Failed to load feedback responses. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refresh = () => void loadFeedback();
    refresh();
    socket.on("feedback:responses-changed", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off("feedback:responses-changed", refresh);
      socket.off("connect", refresh);
    };
  }, [loadFeedback]);

  if (loading) {
    return (
      <section className="adminFeedbackPage">
        {pageHeader}
        <p className="feedbackLoading">Loading feedback...</p>
      </section>
    );
  }

  return (
    <section className="adminFeedbackPage">
      {pageHeader}
      {error && <p role="alert" className="feedback-page-error">{error}</p>}

      {feedbacks.length > 0 ? (
        <ul className="adminFeedbackList">
          {feedbacks.map((feedback) => (
            <li className="adminFeedbackItem" key={feedback._id}>
              <div className="adminFeedbackTop">
                <div className="adminFeedbackUser">
                  <User size={20} />

                  <div>
                    <strong>{feedback.user?.name || "Unknown User"}</strong>

                    <span>{feedback.user?.email || "No email"}</span>
                  </div>
                </div>

                {feedback.ratings !== undefined && <div className="adminFeedbackRating"><Star size={18} fill="currentColor" /><span>{feedback.ratings}/5</span></div>}
              </div>

              <div className="adminFeedbackEvent">
                <CalendarDays size={18} />

                <span>{feedback.event?.title || "Unknown Event"}</span>
              </div>

              {feedback.feedbackForm?._id && <Link to={`/feedback-forms/${feedback.feedbackForm._id}`}>Open form responses</Link>}

              {feedback.answers?.length ? <div className="adminFeedbackAnswers">
                {feedback.answers.map((answer) => {
                  const question = feedback.feedbackForm?.questions?.find((item) => item.questionId === answer.questionId);
                  const option = question?.options?.find((item) => item.optionId === answer.selectedOptionId);
                  return <div className="adminFeedbackAnswer" key={answer.questionId}>
                    <strong>{answer.questionText || question?.text || answer.questionId}</strong>
                    <p>{answer.answerType === "textarea" ? answer.textAnswer : answer.selectedOptionText || option?.text || answer.selectedOptionId}</p>
                  </div>;
                })}
              </div> : feedback.comment !== undefined && <div className="adminFeedbackComment"><MessageSquare size={18} /><p>{feedback.comment}</p></div>}
            </li>
          ))}
        </ul>
      ) : error ? null : (
        <EmptyState
          icon={MessageSquare}
          title="No feedback yet"
          description="Users have not submitted feedback for completed events yet."
          actionLabel="Create feedback"
          actionIcon={<Plus size={18} />}
          onAction={() => navigate("/feedback/create")}
        />
      )}
    </section>
  );
};

export default AdminFeedback;
