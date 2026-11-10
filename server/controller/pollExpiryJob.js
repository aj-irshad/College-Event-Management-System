import mongoose from "mongoose";
import AdminPollsForm from "../model/adminPolls.js";
import { emitPollExpiryToAudience } from "../socket.js";

const MAX_TIMER_DELAY = 2 ** 31 - 1;

let timer = null;
let started = false;
let scheduleVersion = 0;
let refreshPromise = null;
let refreshRequested = false;
const announcedExpiries = new Set();

const clearTimer = () => {
  scheduleVersion += 1;
  if (timer) clearTimeout(timer);
  timer = null;
};

const emitExpiredPolls = async () => {
  const now = new Date();
  const expiredPolls = await AdminPollsForm.find({
    expiresAt: { $type: "date", $lte: now },
  })
    .select("_id expiresAt audienceTargets")
    .lean();

  for (const poll of expiredPolls) {
    const expiryKey = `${poll._id}:${new Date(poll.expiresAt).getTime()}`;
    if (announcedExpiries.has(expiryKey)) continue;
    announcedExpiries.add(expiryKey);
    try {
      emitPollExpiryToAudience(poll);
    } catch (error) {
      console.error("Failed to emit poll expiry:", error.message);
    }
  }
};

const scheduleNextExpiry = async () => {
  const version = ++scheduleVersion;
  if (timer) clearTimeout(timer);
  timer = null;
  if (mongoose.connection.readyState !== 1) return;

  const now = new Date();
  const nextPoll = await AdminPollsForm.findOne({
    expiresAt: { $type: "date", $gt: now },
  })
    .sort({ expiresAt: 1 })
    .select("expiresAt")
    .lean();

  if (
    version !== scheduleVersion ||
    mongoose.connection.readyState !== 1 ||
    !nextPoll?.expiresAt
  ) {
    return;
  }

  const delay = Math.max(
    0,
    Math.min(new Date(nextPoll.expiresAt).getTime() - Date.now(), MAX_TIMER_DELAY),
  );
  timer = setTimeout(() => {
    timer = null;
    void refreshPollExpirySchedule().catch((error) => {
      console.error("Poll expiry transition failed:", error.message);
    });
  }, delay);
  timer.unref?.();
};

const reconcile = async () => {
  if (mongoose.connection.readyState !== 1) {
    clearTimer();
    return;
  }
  await emitExpiredPolls();
  await scheduleNextExpiry();
};

const refreshPollExpirySchedule = () => {
  if (!started) return Promise.resolve();
  refreshRequested = true;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    do {
      refreshRequested = false;
      await reconcile();
    } while (refreshRequested && mongoose.connection.readyState === 1);
  })()
    .catch((error) => {
      console.error("Failed to reconcile poll expiry schedule:", error.message);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
      if (refreshRequested && mongoose.connection.readyState === 1) {
        void refreshPollExpirySchedule().catch((error) => {
          console.error("Poll expiry schedule retry failed:", error.message);
        });
      }
    });

  return refreshPromise;
};

const startPollExpiryJob = () => {
  if (started) return;
  started = true;

  mongoose.connection.on("disconnected", clearTimer);
  mongoose.connection.on("connected", () => {
    void refreshPollExpirySchedule().catch((error) => {
      console.error("Initial poll expiry scheduling failed:", error.message);
    });
  });
  mongoose.connection.on("reconnected", () => {
    void refreshPollExpirySchedule().catch((error) => {
      console.error("Poll expiry scheduling after reconnect failed:", error.message);
    });
  });

  void refreshPollExpirySchedule().catch((error) => {
    console.error("Initial poll expiry scheduling failed:", error.message);
  });
};

export { refreshPollExpirySchedule };
export default startPollExpiryJob;
