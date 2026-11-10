import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { fetchAdminFeedbackResponses } from "../../../services/feedbackService";
import { EmptyState, PageHeader } from "../../../components/ModulePageUI";
import "../styles/adminFeedback.css";

const AdminFeedbackResponses = () => {
  const { formId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    fetchAdminFeedbackResponses(formId)
      .then(({ data: response }) => { if (active) setData(response); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load feedback responses."); });
    return () => { active = false; };
  }, [formId]);

  if (error) return <main className="adminFeedbackPage"><p role="alert">{error}</p><Link to="/feedback-forms">Back to forms</Link></main>;
  if (!data) return <main className="adminFeedbackPage"><p role="status">Loading feedback responses…</p></main>;

  const { feedback, responses } = data;
  return (
    <main className="adminFeedbackPage">
      <Link to="/feedback-forms">Back to feedback forms</Link>
      <PageHeader
        title={feedback.title}
        description={`${feedback.event?.title || "Event unavailable"} · ${responses.length} response(s)`}
      />
      <section className="feedbackFormQuestions">
        <h2>Form questions</h2>
        <ol>{feedback.questions.map((question) => <li key={question.questionId}>{question.text} · {question.type}{question.required ? " · Required" : " · Optional"}</li>)}</ol>
      </section>
      {!responses.length ? <EmptyState icon={MessageSquare} title="No responses yet" description="No one has submitted a response to this feedback form yet." /> : (
        <div className="feedback-response-table-wrap">
          <table className="feedback-response-table">
            <thead><tr><th>Student</th><th>Email</th><th>Department</th><th>Semester</th><th>Submitted</th><th>Answers</th></tr></thead>
            <tbody>{responses.map((response) => (
              <tr key={response._id}>
                <td>{response.user?.name || "Unknown"}</td>
                <td>{response.user?.email || "—"}</td>
                <td>{response.user?.department || "—"}</td>
                <td>{response.user?.semester || "—"}</td>
                <td>{new Date(response.createdAt).toLocaleString()}</td>
                <td><button type="button" onClick={() => setSelected(response)}>View answers</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {selected && (
        <section className="feedback-answer-detail" role="dialog" aria-modal="true" aria-label="Student answers">
          <div className="feedback-answer-detail-header">
            <h2>{selected.user?.name || "Student answers"}</h2>
            <button type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
          {feedback.questions.map((question) => {
            const answer = selected.answers?.find((item) => item.questionId === question.questionId);
            const value = answer?.answerType === "textarea"
              ? answer.textAnswer
              : answer?.selectedOptionText || answer?.selectedOptionId;
            return <article key={question.questionId}><h3>{question.text}</h3><p>{value || (question.required ? "No answer recorded" : "Not answered (optional)")}</p></article>;
          })}
        </section>
      )}
    </main>
  );
};

export default AdminFeedbackResponses;
