import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  fetchFeedbackForm,
  deleteFeedbackForm,
} from "../../../services/feedbackService";

import "../styles/feedbackForm.css";

const FeedbackForms = () => {
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const getFeedbackForms = async () => {
      try {
        const response = await fetchFeedbackForm();
        setFeedbackForms(response.data.feedback || []);
      } catch (error) {
        console.error("Error fetching feedback forms:", error);
      } finally {
        setLoading(false);
      }
    };

    getFeedbackForms();
  }, []);

  const handleDelete = async (feedbackFormId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this feedback form?",
    );

    if (!confirmDelete) return;

    try {
      await deleteFeedbackForm(feedbackFormId);

      setFeedbackForms((prevForms) =>
        prevForms.filter((form) => form._id !== feedbackFormId),
      );
      alert("Successfully deleted the form");
    } catch (error) {
      console.error("Error deleting feedback form:", error);
      alert(error.response?.data?.message || "Failed to delete feedback form.");
    }
  };

  if (loading) {
    return (
      <div className="feedback-forms-loading">
        <p>Loading feedback forms...</p>
      </div>
    );
  }

  return (
    <div className="feedback-forms-page">
      <div className="feedback-forms-header">
        <div>
          <h1>Feedback Forms</h1>
          <p>Manage the feedback forms available to users.</p>
        </div>

        <button
          type="button"
          className="create-feedback-btn"
          onClick={() => navigate("/completed-events")}
        >
          <Plus size={18} />
          Create Feedback
        </button>
      </div>

      {feedbackForms.length === 0 ? (
        <div className="no-feedback-forms">
          <h3>No feedback forms available</h3>
          <p>Create a feedback form for your users.</p>
        </div>
      ) : (
        <div className="feedback-forms-container">
          {feedbackForms.map((form) => (
            <article className="feedback-form-card" key={form._id}>
              <div className="feedback-form-content">
                <span className="feedback-form-type">
                  {form.event?.event_type}
                </span>

                <h2>{form.event?.title}</h2>

                <p className="feedback-form-question">{form.question}</p>
              </div>

              <div className="feedback-form-footer">
                <button
                  type="button"
                  className="delete-feedback-btn"
                  onClick={() => handleDelete(form._id)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackForms;
