import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Edit3, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, PageHeader } from "../../../components/ModulePageUI";
import { deleteFeedbackForm, fetchAdminFeedbackForms } from "../../../services/feedbackService";
import socket from "../../../api/socket";
import "../styles/feedbackForm.css";

const FeedbackForms = () => {
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const loadForms = useCallback(async () => {
    try {
      const { data } = await fetchAdminFeedbackForms();
      setFeedbackForms(data.feedback || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load feedback forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForms();
    const handleAdminChange = () => void loadForms();
    socket.on("feedback:admin-changed", handleAdminChange);
    socket.on("events:updated", handleAdminChange);
    socket.on("events:statuses-updated", handleAdminChange);
    socket.on("connect", handleAdminChange);
    return () => {
      socket.off("feedback:admin-changed", handleAdminChange);
      socket.off("events:updated", handleAdminChange);
      socket.off("events:statuses-updated", handleAdminChange);
      socket.off("connect", handleAdminChange);
    };
  }, [loadForms]);

  const handleDelete = async (feedbackFormId) => {
    if (!window.confirm("Archive this feedback form? Existing responses will be kept.")) return;
    setError("");
    setNotice("");
    try {
      await deleteFeedbackForm(feedbackFormId);
      setFeedbackForms((forms) => forms.filter((form) => form._id !== feedbackFormId));
      setNotice("Form archived. Existing responses were preserved.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to archive feedback form.");
    }
  };

  return (
    <main className="feedback-forms-page">
      <PageHeader
        title="Feedback Forms"
        description="Manage forms associated with completed events."
        actionLabel="Create feedback"
        actionIcon={<Plus size={18} />}
        onAction={() => navigate("/feedback/create")}
      />
      {error && <div className="feedback-form-alert error" role="alert">{error}</div>}
      {notice && <div className="feedback-form-alert success" role="status">{notice}</div>}
      {loading ? <div className="feedback-forms-loading"><p>Loading feedback forms…</p></div> : feedbackForms.length === 0 ? error ? null : (
        <EmptyState
          icon={MessageSquare}
          title="No feedback forms"
          description="Create a feedback form for a completed event to start collecting responses."
          actionLabel="Create feedback"
          actionIcon={<Plus size={18} />}
          onAction={() => navigate("/feedback/create")}
        />
      ) : (
        <div className="feedback-forms-container">
          {feedbackForms.map((form) => (
            <article className="feedback-form-card" key={form._id}>
              <div className="feedback-form-content">
                {(() => {
                  const now = Date.now();
                  const status = form.event?.status !== "Completed"
                    ? "Unavailable"
                    : !form.isPublished
                      ? new Date(form.startsAt).getTime() > now ? "Scheduled" : "Draft"
                      : now < new Date(form.startsAt).getTime()
                        ? "Scheduled"
                        : now >= new Date(form.endsAt).getTime()
                          ? "Expired"
                          : "Published";
                  return <span className={`feedback-form-type ${status.toLowerCase()}`}>{status} · {form.event?.event_type || "Event"}</span>;
                })()}
                <h2>{form.title}</h2>
                {form.description && <p className="feedback-form-description">{form.description}</p>}
                <p className="feedback-form-event"><CalendarDays size={15} />{form.event?.title || "Event unavailable"} · {form.event?.status || "—"}</p>
                {!form.isPublished && Number.isFinite(new Date(form.startsAt).getTime()) && <p>Scheduled publication: {new Date(form.startsAt).toLocaleString()}</p>}
                <p className="feedback-form-question-count">{form.questions?.length || 0} questions · {form.responseCount || 0} responses · closes {new Date(form.endsAt).toLocaleString()}</p>
              </div>
              <div className="feedback-form-footer">
                <button type="button" className="edit-feedback-btn" onClick={() => navigate(`/feedback-forms/${form._id}`)}>View responses</button>
                <button type="button" className="edit-feedback-btn" onClick={() => navigate(`/feedback/forms/${form._id}/edit`)}><Edit3 size={15} />Edit</button>
                <button type="button" className="delete-feedback-btn" onClick={() => void handleDelete(form._id)}><Trash2 size={16} />Archive</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default FeedbackForms;
