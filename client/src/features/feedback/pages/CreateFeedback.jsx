import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from "lucide-react";
import { getEvents } from "../../../services/eventService";
import {
  createFeedback,
  fetchAdminFeedbackForm,
  updateFeedback,
} from "../../../services/feedbackService";
import socket from "../../../api/socket";
import "../styles/createFeedback.css";

const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const newOption = (text = "Option") => ({ optionId: newId(), text });
const newQuestion = () => ({
  questionId: newId(),
  text: "Untitled question",
  type: "radio",
  required: true,
  options: [newOption("Option 1"), newOption("Option 2")],
});
const toLocalDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const CreateFeedback = () => {
  const navigate = useNavigate();
  const { eventId, formId } = useParams();
  const editing = Boolean(formId);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(() => ({
    title: "",
    description: "",
    event: eventId || "",
    startsAt: toLocalDateTime(new Date()),
    endsAt: toLocalDateTime(new Date(Date.now() + 48 * 60 * 60 * 1000)),
    isPublished: true,
    questions: [newQuestion()],
  }));
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [responseCount, setResponseCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await getEvents();
        if (active) setEvents((Array.isArray(data) ? data : []).filter((item) => item.status === "Completed"));
      } catch {
        if (active) setError("Could not load completed events. Please retry.");
      }
    };
    const refresh = () => void load();
    refresh();
    socket.on("events:updated", refresh);
    socket.on("events:statuses-updated", refresh);
    socket.on("connect", refresh);
    return () => {
      active = false;
      socket.off("events:updated", refresh);
      socket.off("events:statuses-updated", refresh);
      socket.off("connect", refresh);
    };
  }, []);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    fetchAdminFeedbackForm(formId)
      .then(({ data }) => {
        if (!active) return;
        const saved = data.feedback;
        setResponseCount(data.responseCount || 0);
        setForm({
          title: saved.title || "",
          description: saved.description || "",
          event: saved.event?._id || "",
          startsAt: toLocalDateTime(saved.startsAt),
          endsAt: toLocalDateTime(saved.endsAt),
          isPublished: saved.isPublished !== false,
          questions: saved.questions?.length ? saved.questions : [newQuestion()],
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Could not load this feedback form.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, formId]);

  const completedEvents = useMemo(() => {
    if (!form.event || events.some((item) => item._id === form.event)) return events;
    return [{ _id: form.event, title: "Selected event (not currently completed)" }, ...events];
  }, [events, form.event]);

  const updateQuestion = (questionId, patch) => setForm((current) => ({
    ...current,
    questions: current.questions.map((question) => question.questionId === questionId ? { ...question, ...patch } : question),
  }));

  const changeQuestionType = (question, type) => {
    if (question.type === type) return;
    if (type === "textarea" && question.options.length && !window.confirm("Changing to paragraph removes this question’s choices. Continue?")) return;
    updateQuestion(question.questionId, {
      type,
      options: type === "textarea" ? [] : question.options.length >= 2 ? question.options : [newOption("Option 1"), newOption("Option 2")],
    });
  };

  const moveQuestion = (index, offset) => setForm((current) => {
    const target = index + offset;
    if (target < 0 || target >= current.questions.length) return current;
    const questions = [...current.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    return { ...current, questions };
  });

  const saveForm = async (isPublished) => {
    setError("");
    if (!form.title.trim()) return setError("Enter a form title.");
    if (!form.event) return setError("Select a completed event.");
    for (const question of form.questions) {
      if (!question.text.trim()) return setError("Every question needs text.");
      if (question.type === "textarea") continue;
      if (question.options.length < 2) return setError("Radio and dropdown questions need at least two options.");
      const optionTexts = question.options.map((option) => option.text.trim().toLocaleLowerCase());
      if (optionTexts.some((text) => !text)) return setError("Options cannot be empty.");
      if (new Set(optionTexts).size !== optionTexts.length) return setError("Options must be distinct within each question.");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        isPublished,
      };
      if (editing) await updateFeedback(formId, payload);
      else await createFeedback(payload);
      navigate("/feedback-forms");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save the feedback form.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="feedback-builder-state">Loading feedback form…</div>;

  return (
    <main className="feedback-builder-page">
      <header className="feedback-builder-header">
        <div><p>Completed event feedback</p><h1>{editing ? "Edit feedback form" : "Create feedback form"}</h1></div>
        <button type="button" className="feedback-preview-toggle" onClick={() => setPreview((value) => !value)}><Eye size={17} />{preview ? "Edit questions" : "Preview form"}</button>
      </header>
      {error && <div className="feedback-builder-error" role="alert">{error}</div>}
      {responseCount > 0 && <p className="feedback-builder-note">This form has {responseCount} response(s). Question and event structure is locked to preserve those responses.</p>}

      <section className="feedback-builder-card feedback-form-details">
        <label>Form title<input maxLength={160} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Give your form a title" /></label>
        <label>Description <span className="optional-label">Optional</span><textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add instructions or context" /></label>
        <label>Completed event<select value={form.event} onChange={(event) => setForm((current) => ({ ...current, event: event.target.value }))} disabled={responseCount > 0}>
          <option value="">Select a completed event</option>
          {completedEvents.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}
        </select></label>
        <div className="feedback-date-fields">
          <label>Opens at<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} /></label>
          <label>Closes at<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} /></label>
        </div>
      </section>

      {preview ? (
        <section className="feedback-preview-card">
          <p className="feedback-preview-eyebrow">Preview</p><h2>{form.title || "Untitled feedback form"}</h2>
          {form.description && <p>{form.description}</p>}
          {form.questions.map((question, index) => <div className="feedback-preview-question" key={question.questionId}>
            <strong>{index + 1}. {question.text || "Untitled question"}{question.required && <em> *</em>}</strong>
            {question.type === "textarea" ? <textarea disabled placeholder="Long answer text" /> : question.type === "dropdown" ? <select disabled><option>Select an option</option>{question.options.map((option) => <option key={option.optionId}>{option.text}</option>)}</select> : question.options.map((option) => <label key={option.optionId}><input type="radio" disabled /> {option.text}</label>)}
          </div>)}
        </section>
      ) : (
        <section className="feedback-question-editor">
          <div className="feedback-question-heading"><h2>Questions</h2><button type="button" disabled={responseCount > 0 || form.questions.length >= 50} onClick={() => setForm((current) => ({ ...current, questions: [...current.questions, newQuestion()] }))}><Plus size={16} />Add question</button></div>
          {form.questions.map((question, index) => <article className="feedback-question-card" key={question.questionId}>
            <div className="feedback-question-toolbar"><span>Question {index + 1}</span><div>
              <button type="button" aria-label="Move question up" disabled={responseCount > 0 || index === 0} onClick={() => moveQuestion(index, -1)}><ArrowUp size={16} /></button>
              <button type="button" aria-label="Move question down" disabled={responseCount > 0 || index === form.questions.length - 1} onClick={() => moveQuestion(index, 1)}><ArrowDown size={16} /></button>
              <button type="button" aria-label="Delete question" disabled={responseCount > 0 || form.questions.length === 1} onClick={() => setForm((current) => ({ ...current, questions: current.questions.filter((item) => item.questionId !== question.questionId) }))}><Trash2 size={16} /></button>
            </div></div>
            <input className="feedback-question-text" maxLength={500} value={question.text} onChange={(event) => updateQuestion(question.questionId, { text: event.target.value })} placeholder="Question text" disabled={responseCount > 0} />
            <div className="feedback-question-settings">
              <label>Question type<select value={question.type} onChange={(event) => changeQuestionType(question, event.target.value)} disabled={responseCount > 0}><option value="radio">Multiple choice</option><option value="textarea">Paragraph</option><option value="dropdown">Dropdown</option></select></label>
              <label className="feedback-required-toggle"><input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.questionId, { required: event.target.checked })} disabled={responseCount > 0} /> Required</label>
            </div>
            {question.type === "textarea" ? <div className="feedback-question-placeholder">Users will enter a paragraph response.</div> : <div className="feedback-option-editor">
              {question.options.map((option) => <div className="feedback-option-row" key={option.optionId}><span>{question.type === "radio" ? "◯" : "▾"}</span><input maxLength={200} value={option.text} onChange={(event) => updateQuestion(question.questionId, { options: question.options.map((item) => item.optionId === option.optionId ? { ...item, text: event.target.value } : item) })} disabled={responseCount > 0} /><button type="button" aria-label="Remove option" disabled={responseCount > 0 || question.options.length <= 2} onClick={() => updateQuestion(question.questionId, { options: question.options.filter((item) => item.optionId !== option.optionId) })}><Trash2 size={15} /></button></div>)}
              <button type="button" className="feedback-add-option" disabled={responseCount > 0 || question.options.length >= 25} onClick={() => updateQuestion(question.questionId, { options: [...question.options, newOption(`Option ${question.options.length + 1}`)] })}><Plus size={15} />Add option</button>
            </div>}
          </article>)}
        </section>
      )}

      <footer className="feedback-builder-actions">
        <button type="button" className="feedback-builder-cancel" onClick={() => navigate(-1)}>Cancel</button>
        <button type="button" className="feedback-builder-draft" disabled={saving} onClick={() => void saveForm(false)}>{saving ? "Saving…" : "Save draft"}</button>
        <button type="button" className="feedback-builder-publish" disabled={saving} onClick={() => void saveForm(true)}>{saving ? "Saving…" : "Publish form"}</button>
      </footer>
    </main>
  );
};

export default CreateFeedback;
