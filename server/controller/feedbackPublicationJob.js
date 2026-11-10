import mongoose from "mongoose";
import FeedbackForm from "../model/feedbackAdmin.js";
import Users from "../model/user.js";
import createNotification from "../utils/bellNotification.js";
import { getIO } from "../socket.js";

const MAX_TIMER_DELAY = 2 ** 31 - 1;
const FEEDBACK_TTL_MS = 48 * 60 * 60 * 1000;

let timer = null;
let started = false;
let refreshPromise = null;
let refreshRequested = false;

const clearScheduledPublication = () => {
  if (timer) clearTimeout(timer);
  timer = null;
};

const emitFeedbackChange = (eventName, payload) => {
  try {
    getIO().emit(eventName, payload);
  } catch (error) {
    console.error(`Failed to emit ${eventName}:`, error.message);
  }
};

const isCurrentlyAvailable = (form, now = new Date()) => {
  const startsAt = new Date(form.startsAt).getTime();
  const endsAt = new Date(form.endsAt).getTime();
  const createdAt = new Date(form.createdAt).getTime();
  return form.isDeleted !== true
    && form.isPublished === true
    && form.event?.status === "Completed"
    && Number.isFinite(startsAt)
    && Number.isFinite(endsAt)
    && endsAt > startsAt
    && now.getTime() >= startsAt
    && now.getTime() < endsAt
    && Number.isFinite(createdAt)
    && now.getTime() < createdAt + FEEDBACK_TTL_MS;
};

const notifyEligibleStudents = async (form) => {
  const recipients = await Users.find({ role: "user" }).select("_id").lean();
  await createNotification(
    "New Feedback Form",
    "A new feedback form has been posted.",
    "feedback",
    form._id,
    { recipientIds: recipients.map(({ _id }) => _id) },
  );
};

const publishDueForms = async (now) => {
  const dueForms = await FeedbackForm.find({
    isDeleted: { $ne: true },
    isPublished: false,
    startsAt: { $type: "date", $lte: now },
  }).select("_id").lean();

  for (const candidate of dueForms) {
    // The conditional update makes duplicate scheduler executions harmless.
    const published = await FeedbackForm.findOneAndUpdate(
      {
        _id: candidate._id,
        isDeleted: { $ne: true },
        isPublished: false,
        startsAt: { $type: "date", $lte: now },
      },
      { $set: { isPublished: true } },
      { returnDocument: "after", runValidators: true },
    );
    if (!published) continue;

    const populated = await FeedbackForm.findById(published._id)
      .populate("event", "title event_type department status start_at end_at");
    if (!populated || populated.isDeleted) continue;
    const view = typeof populated.toObject === "function" ? populated.toObject() : populated;
    try {
      getIO().to("admins").emit("feedback:admin-changed", {
        action: "published",
        formId: String(populated._id),
      });
    } catch (error) {
      console.error("Failed to emit admin feedback publication update:", error.message);
    }
    if (isCurrentlyAvailable(populated, now)) {
      emitFeedbackChange("feedback:created", {
        ...view,
        title: view.title || view.question || "Event feedback",
        description: view.description || "",
      });
      try {
        await notifyEligibleStudents(populated);
      } catch (error) {
        console.error("Failed to create scheduled feedback notifications:", error.message);
      }
    }
  }
};

const reconcileAndSchedule = async () => {
  clearScheduledPublication();
  if (mongoose.connection.readyState !== 1) return;

  const now = new Date();
  await publishDueForms(now);
  if (mongoose.connection.readyState !== 1) return;

  const [nextForm] = await FeedbackForm.find({
    isDeleted: { $ne: true },
    isPublished: false,
    startsAt: { $type: "date", $gt: now },
  })
    .select("startsAt")
    .sort({ startsAt: 1 })
    .limit(1)
    .lean();
  if (!nextForm || mongoose.connection.readyState !== 1) return;

  const delay = Math.max(0, Math.min(new Date(nextForm.startsAt).getTime() - Date.now(), MAX_TIMER_DELAY));
  timer = setTimeout(() => {
    timer = null;
    void refreshFeedbackPublicationSchedule().catch((error) => {
      console.error("Scheduled feedback publication failed:", error.message);
    });
  }, delay);
  timer.unref?.();
};

const refreshFeedbackPublicationSchedule = () => {
  if (!started) return Promise.resolve();
  refreshRequested = true;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    do {
      refreshRequested = false;
      if (mongoose.connection.readyState !== 1) {
        clearScheduledPublication();
        break;
      }
      await reconcileAndSchedule();
    } while (refreshRequested && mongoose.connection.readyState === 1);
  })().finally(() => {
    refreshPromise = null;
    if (refreshRequested && mongoose.connection.readyState === 1) {
      void refreshFeedbackPublicationSchedule().catch((error) => {
        console.error("Feedback publication schedule refresh failed:", error.message);
      });
    }
  });

  return refreshPromise;
};

const startFeedbackPublicationJob = () => {
  if (started) return;
  started = true;

  mongoose.connection.on("disconnected", clearScheduledPublication);
  const reconcile = () => {
    void refreshFeedbackPublicationSchedule().catch((error) => {
      console.error("Feedback publication schedule reconciliation failed:", error.message);
    });
  };
  mongoose.connection.on("connected", reconcile);
  mongoose.connection.on("reconnected", reconcile);
  reconcile();
};

export { refreshFeedbackPublicationSchedule };
export default startFeedbackPublicationJob;
