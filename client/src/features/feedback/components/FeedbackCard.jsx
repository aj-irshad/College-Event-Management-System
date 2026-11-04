import { useState } from "react";
import { submitFeedback } from "../../../services/feedbackService";

const FeedbackCard = ({ feedback, onSubmitted }) => {
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const missing = feedback.questions.find((question) => {
      if (!question.required) return false;
      const value = answers[question.questionId];
      return question.type === "textarea" ? !String(value || "").trim() : !value;
    });
    if (missing) {
      setError(`Please answer: ${missing.text}`);
      return;
    }

    const submittedAnswers = feedback.questions.flatMap((question) => {
      const value = answers[question.questionId];
      if (!value || (question.type === "textarea" && !value.trim())) return [];
      return [question.type === "textarea"
        ? { questionId: question.questionId, answerType: question.type, textAnswer: value }
        : { questionId: question.questionId, answerType: question.type, selectedOptionId: value }];
    });

    setSaving(true);
    try {
      await submitFeedback({ feedbackForm: feedback._id, answers: submittedAnswers });
      onSubmitted(feedback._id, feedback.event?._id);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not submit feedback. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="feedbackCard">
      <header className="feedbackCardHeader">
        <span>{feedback.event?.event_type || "Completed event"} · {feedback.event?.title || "Event"}</span>
        <h2>{feedback.title}</h2>
        {feedback.description && <p>{feedback.description}</p>}
      </header>
      <form className="feedbackCardBody" onSubmit={handleSubmit}>
        {feedback.questions.map((question, index) => (
          <fieldset className="feedback-dynamic-question" key={question.questionId}>
            <legend>{index + 1}. {question.text}{question.required && <span className="feedback-required-mark"> *</span>}</legend>
            {question.type === "radio" && question.options.map((option) => (
              <label className="feedback-radio-option" key={option.optionId}>
                <input type="radio" name={`${feedback._id}-${question.questionId}`} value={option.optionId} checked={answers[question.questionId] === option.optionId} onChange={() => setAnswers((current) => ({ ...current, [question.questionId]: option.optionId }))} />
                <span>{option.text}</span>
              </label>
            ))}
            {question.type === "dropdown" && (
              <select className="feedback-answer-control" value={answers[question.questionId] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))}>
                <option value="">Choose an option</option>
                {question.options.map((option) => <option key={option.optionId} value={option.optionId}>{option.text}</option>)}
              </select>
            )}
            {question.type === "textarea" && (
              <textarea className="feedback-answer-control" maxLength={5000} rows={4} value={answers[question.questionId] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))} placeholder="Your answer" />
            )}
          </fieldset>
        ))}
        {error && <p className="feedback-submit-error" role="alert">{error}</p>}
        <button className="feedback-submit-button" type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit feedback"}</button>
      </form>
    </article>
  );
};

export default FeedbackCard;
