import { useCallback, useEffect, useState } from "react";
import { Star, User, CalendarDays, MessageSquare } from "lucide-react";

import { fetchAllFeedback } from "../../../services/feedbackService";
import socket from "../../../api/socket";
import "../styles/adminFeedback.css";

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeedback = useCallback(async () => {
    try {
      const response = await fetchAllFeedback();
      setFeedbacks(response.data.feedback || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
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
        <p className="feedbackLoading">Loading feedback...</p>
      </section>
    );
  }

  return (
    <section className="adminFeedbackPage">
      <header className="adminFeedbackHeader">
        <div>
          <p className="adminFeedbackEyebrow">User Responses</p>

          <h1 className="adminFeedbackTitle">Feedback</h1>

          <p className="adminFeedbackSubtitle">
            View feedback submitted by users for college events.
          </p>
        </div>
      </header>

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
      ) : (
        <section className="empty-admin-feedback">
          <div className="empty-admin-feedback-icon">✦</div>

          <h2>No feedback yet</h2>

          <p>Users have not submitted any feedback yet.</p>
        </section>
      )}
    </section>
  );
};

export default AdminFeedback;
