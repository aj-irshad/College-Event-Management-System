import FeedbackForm from "../model/feedbackAdmin.js";
import Feedback from "../model/feedback.js";
import Event from "../model/events.js";
import createNotification from "../utils/bellNotification.js";
import { getIO } from "../socket.js";

const FEEDBACK_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_QUESTIONS = 50;
const MAX_OPTIONS = 25;
const MAX_ANSWER_LENGTH = 5000;
const QUESTION_TYPES = ["radio", "textarea", "dropdown"];
const isValidId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));
const isValidStableId = (id) => typeof id === "string" && /^[\w-]{1,128}$/.test(id);

const legacyQuestions = (legacyQuestion = "Feedback") => [
  {
    questionId: "legacy-rating",
    text: "How would you rate this event?",
    type: "radio",
    required: true,
    options: [1, 2, 3, 4, 5].map((rating) => ({
      optionId: `rating-${rating}`,
      text: String(rating),
    })),
  },
  {
    questionId: "legacy-comment",
    text: legacyQuestion,
    type: "textarea",
    required: true,
    options: [],
  },
];

const getQuestions = (form) =>
  Array.isArray(form.questions) && form.questions.length
    ? form.questions.map((question) => ({
        questionId: question.questionId,
        text: question.text,
        type: question.type,
        required: question.required,
        options: (question.options || []).map((option) => ({
          optionId: option.optionId,
          text: option.text,
        })),
      }))
    : legacyQuestions(form.question || form.title || "Share your feedback");

const formView = (form) => {
  const value = typeof form.toObject === "function" ? form.toObject() : { ...form };
  const legacy = !Array.isArray(value.questions) || value.questions.length === 0;
  const createdAt = value.createdAt ? new Date(value.createdAt) : new Date();
  return {
    ...value,
    title: value.title || value.question || "Event feedback",
    description: value.description || "",
    questions: getQuestions(value),
    startsAt: value.startsAt || createdAt,
    endsAt: value.endsAt || new Date(createdAt.getTime() + FEEDBACK_TTL_MS),
    isPublished: value.isPublished !== false,
    isDeleted: value.isDeleted === true,
    legacy,
  };
};

const isEligible = (form, now = new Date()) => {
  const view = formView(form);
  const start = new Date(view.startsAt).getTime();
  const end = new Date(view.endsAt).getTime();
  return (
    !view.isDeleted &&
    view.isPublished &&
    view.event?.status === "Completed" &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end > start &&
    now.getTime() >= start &&
    now.getTime() < end &&
    now.getTime() < new Date(view.createdAt).getTime() + FEEDBACK_TTL_MS
  );
};

const emitAdminChange = (action, formId) => {
  try {
    getIO().to("admins").emit("feedback:admin-changed", {
      action,
      formId: String(formId),
    });
  } catch (error) {
    console.error("Failed to emit admin feedback update:", error.message);
  }
};

const emitPublicChange = (eventName, payload) => {
  try {
    getIO().emit(eventName, payload);
  } catch (error) {
    console.error(`Failed to emit ${eventName}:`, error.message);
  }
};

const validateQuestions = (input) => {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_QUESTIONS) {
    return { error: `A feedback form must contain 1 to ${MAX_QUESTIONS} questions` };
  }

  const questionIds = new Set();
  const optionIds = new Set();
  const questions = [];

  for (const item of input) {
    if (!item || !isValidStableId(item.questionId) || questionIds.has(item.questionId)) {
      return { error: "Question IDs must be valid and unique within the form" };
    }
    questionIds.add(item.questionId);
    if (typeof item.text !== "string" || !item.text.trim() || item.text.trim().length > 500) {
      return { error: "Each question needs text of 1 to 500 characters" };
    }
    if (!QUESTION_TYPES.includes(item.type)) {
      return { error: "Unsupported feedback question type" };
    }
    if (typeof item.required !== "boolean") {
      return { error: "Each question must specify whether it is required" };
    }

    const rawOptions = item.options ?? [];
    if (!Array.isArray(rawOptions)) return { error: "Question options must be a list" };
    if (item.type === "textarea" && rawOptions.length) {
      return { error: "Paragraph questions cannot contain options" };
    }
    if (item.type !== "textarea" && (rawOptions.length < 2 || rawOptions.length > MAX_OPTIONS)) {
      return { error: `Radio and dropdown questions need 2 to ${MAX_OPTIONS} options` };
    }

    const options = [];
    const optionTexts = new Set();
    for (const option of rawOptions) {
      const text = typeof option?.text === "string" ? option.text.trim() : "";
      const normalizedText = text.toLocaleLowerCase();
      if (!isValidStableId(option?.optionId) || optionIds.has(option.optionId)) {
        return { error: "Option IDs must be valid and unique within the form" };
      }
      if (!text || text.length > 200 || optionTexts.has(normalizedText)) {
        return { error: "Options must be non-empty, distinct, and at most 200 characters" };
      }
      optionIds.add(option.optionId);
      optionTexts.add(normalizedText);
      options.push({ optionId: option.optionId, text });
    }

    questions.push({
      questionId: item.questionId,
      text: item.text.trim(),
      type: item.type,
      required: item.required,
      options,
    });
  }

  return { questions };
};

const validateFormData = (body, { existing, eventId, createdAt } = {}) => {
  const rawTitle = body.title ?? body.question ?? existing?.title ?? existing?.question ?? "";
  const rawDescription = body.description ?? existing?.description ?? "";
  if (typeof rawTitle !== "string" || typeof rawDescription !== "string") {
    return { error: "Form title and description must be text" };
  }
  const title = rawTitle.trim();
  const description = rawDescription.trim();
  if (!title || title.length > 160) return { error: "Form title is required and must be 160 characters or fewer" };
  if (description.length > 2000) return { error: "Form description must be 2,000 characters or fewer" };

  let rawQuestions = body.questions;
  if (rawQuestions === undefined && existing) rawQuestions = getQuestions(existing);
  if (rawQuestions === undefined && typeof body.question === "string" && body.question.trim()) {
    rawQuestions = legacyQuestions(body.question.trim());
  }
  const questionResult = validateQuestions(rawQuestions);
  if (questionResult.error) return questionResult;

  const baseTime = createdAt || new Date();
  const rawStartsAt = body.startsAt === undefined ? (existing ? formView(existing).startsAt : baseTime) : body.startsAt;
  const rawEndsAt = body.endsAt === undefined ? (existing ? formView(existing).endsAt : new Date(baseTime.getTime() + FEEDBACK_TTL_MS)) : body.endsAt;
  if (rawStartsAt === null || rawStartsAt === "" || rawEndsAt === null || rawEndsAt === "") {
    return { error: "Feedback form start and end dates are required" };
  }
  const startsAt = new Date(rawStartsAt);
  const endsAt = new Date(rawEndsAt);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) {
    return { error: "Feedback form start and end dates must be valid" };
  }
  if (endsAt <= startsAt) return { error: "Feedback form end must be after its start" };
  if (endsAt.getTime() > baseTime.getTime() + FEEDBACK_TTL_MS) {
    return { error: "Feedback forms cannot remain open beyond the existing 48-hour retention period" };
  }

  const isPublished = body.isPublished === undefined
    ? (existing ? existing.isPublished !== false : true)
    : body.isPublished;
  if (typeof isPublished !== "boolean") return { error: "Published status must be true or false" };
  if (isPublished && startsAt.getTime() > Date.now()) {
    return { error: "Save future-dated forms as drafts; they can be published when their start time arrives" };
  }

  return {
    data: {
      event: eventId,
      title,
      description,
      question: questionResult.questions[0].text,
      questions: questionResult.questions,
      startsAt,
      endsAt,
      isPublished,
    },
  };
};

const questionStructure = (questions) =>
  JSON.stringify(questions.map((question) => ({
    questionId: question.questionId,
    text: question.text,
    type: question.type,
    required: question.required,
    options: question.options.map((option) => ({ optionId: option.optionId, text: option.text })),
  })));

const validateAnswers = (questions, input) => {
  if (!Array.isArray(input) || input.length > MAX_QUESTIONS) {
    return { error: "Answers must be provided as a list" };
  }

  const questionById = new Map(questions.map((question) => [question.questionId, question]));
  const seen = new Set();
  const answersById = new Map();
  for (const answer of input) {
    if (!answer || typeof answer.questionId !== "string" || seen.has(answer.questionId)) {
      return { error: "Answers contain an invalid or duplicate question ID" };
    }
    const question = questionById.get(answer.questionId);
    if (!question) return { error: "Answers contain an unknown question ID" };
    if (answer.answerType !== question.type) return { error: "Answer type does not match its question" };
    const allowedKeys = question.type === "textarea"
      ? ["questionId", "answerType", "textAnswer"]
      : ["questionId", "answerType", "selectedOptionId"];
    if (Object.keys(answer).some((key) => !allowedKeys.includes(key))) {
      return { error: "Answer contains fields that do not match its question type" };
    }
    seen.add(answer.questionId);

    if (question.type === "textarea") {
      if (Object.hasOwn(answer, "selectedOptionId") || typeof answer.textAnswer !== "string" || answer.textAnswer.length > MAX_ANSWER_LENGTH) {
        return { error: "Paragraph answers must be text of at most 5,000 characters" };
      }
      answersById.set(answer.questionId, {
        questionId: answer.questionId,
        questionText: question.text,
        answerType: question.type,
        textAnswer: answer.textAnswer,
      });
    } else {
      if (Object.hasOwn(answer, "textAnswer") || typeof answer.selectedOptionId !== "string") {
        return { error: "Choice answers must select one option" };
      }
      const option = question.options.find((item) => item.optionId === answer.selectedOptionId);
      if (!option) return { error: "Selected option does not belong to this question" };
      answersById.set(answer.questionId, {
        questionId: answer.questionId,
        questionText: question.text,
        answerType: question.type,
        selectedOptionId: option.optionId,
        selectedOptionText: option.text,
      });
    }
  }

  for (const question of questions) {
    const answer = answersById.get(question.questionId);
    const hasValue = question.type === "textarea"
      ? Boolean(answer?.textAnswer.trim())
      : Boolean(answer?.selectedOptionId);
    if (question.required && !hasValue) {
      return { error: `Please answer the required question: ${question.text}` };
    }
  }

  return { answers: questions.flatMap((question) => {
    const answer = answersById.get(question.questionId);
    if (!answer) return [];
    if (question.type === "textarea" && !answer.textAnswer.trim()) return [];
    return [answer];
  }) };
};

const createFeedback = async (req, res) => {
  const eventId = req.body?.event;
  if (!isValidId(eventId)) return res.status(400).json({ message: "A valid completed event is required" });

  try {
    const event = await Event.findById(eventId).select("title event_type department status");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.status !== "Completed") {
      return res.status(400).json({ message: "Feedback forms can only be created for completed events" });
    }

    const activeForm = await FeedbackForm.findOne({
      event: eventId,
      isDeleted: { $ne: true },
      $or: [
        { endsAt: { $gt: new Date() } },
        { endsAt: { $exists: false }, createdAt: { $gt: new Date(Date.now() - FEEDBACK_TTL_MS) } },
      ],
    }).select("_id");
    if (activeForm) {
      return res.status(409).json({ message: "An active feedback form already exists for this event" });
    }

    const now = new Date();
    const { data, error } = validateFormData(req.body || {}, { eventId, createdAt: now });
    if (error) return res.status(400).json({ message: error });
    const form = await FeedbackForm.create(data);
    const populated = await FeedbackForm.findById(form._id).populate("event", "title event_type department status");
    const view = formView(populated);

    emitAdminChange("created", form._id);
    if (isEligible(view)) {
      emitPublicChange("feedback:created", view);
      createNotification("New Feedback Form", "A new feedback form has been posted.", "feedback", form._id)
        .catch((notificationError) => console.error("Feedback notification error:", notificationError.message));
    }

    return res.status(201).json({ message: "Feedback form created successfully", feedback: view });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A feedback form already exists for this event" });
    console.error("Failed to create feedback form:", error.message);
    return res.status(500).json({ message: "Failed to create feedback form" });
  }
};

const getFeedback = async (req, res) => {
  try {
    const [submitted, forms] = await Promise.all([
      Feedback.find({ user: req.userId }).select("feedbackForm event").lean(),
      FeedbackForm.find({ isDeleted: { $ne: true }, isPublished: { $ne: false } })
        .populate("event", "title event_type department status start_at end_at")
        .sort({ createdAt: -1 }),
    ]);
    const submittedIds = new Set(submitted.map((item) => String(item.feedbackForm)));
    const submittedEventIds = new Set(submitted.map((item) => String(item.event)));
    const visibleEvents = new Set();
    const feedback = forms.flatMap((form) => {
      const eventId = String(form.event?._id);
      if (
        !submittedIds.has(String(form._id)) &&
        !submittedEventIds.has(eventId) &&
        !visibleEvents.has(eventId) &&
        isEligible(form)
      ) {
        visibleEvents.add(eventId);
        return [formView(form)];
      }
      return [];
    });
    return res.status(200).json({ feedback });
  } catch (error) {
    console.error("Failed to fetch eligible feedback forms:", error.message);
    return res.status(500).json({ message: "Failed to fetch feedback" });
  }
};

const getAdminFeedbackForms = async (req, res) => {
  try {
    const forms = await FeedbackForm.find({ isDeleted: { $ne: true } })
      .populate("event", "title event_type department status start_at end_at")
      .sort({ createdAt: -1 });
    return res.status(200).json({ feedback: forms.map(formView) });
  } catch (error) {
    console.error("Failed to fetch admin feedback forms:", error.message);
    return res.status(500).json({ message: "Failed to fetch feedback forms" });
  }
};

const getAdminFeedbackForm = async (req, res) => {
  if (!isValidId(req.params.feedbackFormId)) return res.status(400).json({ message: "Invalid feedback form ID" });
  try {
    const form = await FeedbackForm.findOne({ _id: req.params.feedbackFormId, isDeleted: { $ne: true } })
      .populate("event", "title event_type department status start_at end_at");
    if (!form) return res.status(404).json({ message: "Feedback form not found" });
    const responseCount = await Feedback.countDocuments({ feedbackForm: form._id });
    return res.status(200).json({ feedback: formView(form), responseCount });
  } catch (error) {
    console.error("Failed to fetch feedback form:", error.message);
    return res.status(500).json({ message: "Failed to fetch feedback form" });
  }
};

const updateFeedback = async (req, res) => {
  const { feedbackFormId } = req.params;
  if (!isValidId(feedbackFormId)) return res.status(400).json({ message: "Invalid feedback form ID" });

  try {
    const form = await FeedbackForm.findOne({ _id: feedbackFormId, isDeleted: { $ne: true } });
    if (!form) return res.status(404).json({ message: "Feedback form not found" });

    const eventId = req.body?.event || String(form.event);
    if (!isValidId(eventId)) return res.status(400).json({ message: "A valid completed event is required" });
    const event = await Event.findById(eventId).select("title event_type department status");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.status !== "Completed") {
      return res.status(400).json({ message: "Feedback forms can only be updated while their event is completed" });
    }

    const { data, error } = validateFormData(req.body || {}, {
      existing: form,
      eventId,
      createdAt: form.createdAt || new Date(),
    });
    if (error) return res.status(400).json({ message: error });

    const responseCount = await Feedback.countDocuments({ feedbackForm: form._id });
    if (responseCount > 0) {
      if (String(form.event) !== String(eventId)) {
        return res.status(409).json({ message: "The event cannot be changed after responses have been submitted" });
      }
      if (questionStructure(getQuestions(form)) !== questionStructure(data.questions)) {
        return res.status(409).json({ message: "Questions and options cannot be changed after responses have been submitted" });
      }
    }

    const wasEligible = isEligible({ ...form.toObject(), event: await Event.findById(form.event).select("status") });
    Object.assign(form, data);
    await form.save();
    const populated = await FeedbackForm.findById(form._id).populate("event", "title event_type department status start_at end_at");
    const view = formView(populated);
    const eligible = isEligible(view);

    emitAdminChange("updated", form._id);
    if (eligible) emitPublicChange(wasEligible ? "feedback:updated" : "feedback:created", view);
    else if (wasEligible) emitPublicChange("feedback:deleted", { _id: String(form._id) });
    if (eligible && !wasEligible) {
      createNotification("New Feedback Form", "A new feedback form has been posted.", "feedback", form._id)
        .catch((notificationError) => console.error("Feedback notification error:", notificationError.message));
    }

    return res.status(200).json({ message: "Feedback form updated successfully", feedback: view });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A feedback form already exists for this event" });
    console.error("Failed to update feedback form:", error.message);
    return res.status(500).json({ message: "Failed to update feedback form" });
  }
};

const submitFeedback = async (req, res) => {
  const feedbackFormId = req.body?.feedbackForm;
  if (!isValidId(feedbackFormId)) return res.status(400).json({ message: "Invalid feedback form ID" });

  try {
    const form = await FeedbackForm.findOne({ _id: feedbackFormId, isDeleted: { $ne: true } })
      .populate("event", "title event_type department status start_at end_at");
    if (!form) return res.status(404).json({ message: "Feedback form not found or expired" });
    if (form.event?.status !== "Completed") {
      return res.status(409).json({ message: "Feedback is only available for completed events" });
    }
    if (!isEligible(form)) {
      return res.status(410).json({ message: "This feedback form is unpublished, not open yet, or has expired" });
    }

    const existing = await Feedback.findOne({ event: form.event._id, user: req.userId }).select("_id");
    if (existing) return res.status(409).json({ message: "You have already submitted this feedback" });

    const questions = getQuestions(form);
    let submittedAnswers = req.body.answers;
    const legacy = !form.questions?.length;
    if (legacy && !Array.isArray(submittedAnswers) && req.body.ratings !== undefined) {
      submittedAnswers = [
        { questionId: "legacy-rating", answerType: "radio", selectedOptionId: `rating-${req.body.ratings}` },
        { questionId: "legacy-comment", answerType: "textarea", textAnswer: req.body.comment },
      ];
    }
    const { answers, error } = validateAnswers(questions, submittedAnswers);
    if (error) return res.status(400).json({ message: error });

    const response = {
      feedbackForm: form._id,
      event: form.event._id,
      user: req.userId,
      answers,
    };
    if (legacy) {
      const rating = answers.find((answer) => answer.questionId === "legacy-rating");
      const comment = answers.find((answer) => answer.questionId === "legacy-comment");
      response.ratings = Number(rating.selectedOptionId.slice("rating-".length));
      response.comment = comment.textAnswer;
    }
    const feedback = await Feedback.create(response);
    try {
      getIO().to("admins").emit("feedback:responses-changed", {
        formId: String(form._id),
      });
    } catch (socketError) {
      console.error("Failed to emit feedback response update:", socketError.message);
    }
    return res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already submitted feedback for this event" });
    console.error("Failed to submit feedback:", error.message);
    return res.status(500).json({ message: "Failed to submit feedback" });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate("user", "name email")
      .populate("event", "title")
      .populate("feedbackForm", "title question questions");
    return res.status(200).json({ success: true, feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch feedback" });
  }
};

const deleteFeedbackForm = async (req, res) => {
  const { feedbackFormId } = req.params;
  if (!isValidId(feedbackFormId)) return res.status(400).json({ message: "Invalid feedback form ID" });

  try {
    const form = await FeedbackForm.findOne({ _id: feedbackFormId, isDeleted: { $ne: true } })
      .populate("event", "title event_type department status start_at end_at");
    if (!form) return res.status(404).json({ message: "Feedback form not found" });
    const wasEligible = isEligible(form);
    form.isDeleted = true;
    form.isPublished = false;
    await form.save();

    emitAdminChange("deleted", form._id);
    if (wasEligible) emitPublicChange("feedback:deleted", { _id: String(form._id) });
    return res.status(200).json({ message: "Feedback form archived; existing responses were preserved" });
  } catch (error) {
    console.error("Error deleting feedback form:", error.message);
    return res.status(500).json({ message: "Failed to delete feedback form" });
  }
};

export {
  createFeedback,
  getFeedback,
  submitFeedback,
  getAllFeedback,
  getAdminFeedbackForms,
  getAdminFeedbackForm,
  updateFeedback,
  deleteFeedbackForm,
};
