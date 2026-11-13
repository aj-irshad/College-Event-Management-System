import PendingUser from "../model/pendingUser.js";
import { removePendingProfileImageIfUnused } from "../utils/pendingProfileImageCleanup.js";

const PENDING_SIGNUP_LIFETIME_MS = 24 * 60 * 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const SWEEP_LIMIT = 50;

let timer = null;
let started = false;
let activeSweep = null;

const logCleanupError = (error) => {
  console.error("Pending signup cleanup failed:", {
    name: error?.name || "Error",
    code: error?.code || null,
  });
};

const cleanupExpiredPendingSignups = async () => {
  const now = new Date();
  const legacyCutoff = new Date(now.getTime() - PENDING_SIGNUP_LIFETIME_MS);
  const expiredRegistration = {
    $or: [
      { registrationExpiresAt: { $lte: now } },
      {
        registrationExpiresAt: { $exists: false },
        createdAt: { $lte: legacyCutoff },
      },
    ],
  };
  const safeToRemove = {
    $and: [
      expiredRegistration,
      {
        $or: [
          { otpExpires: { $exists: false } },
          { otpExpires: null },
          { otpExpires: { $lte: now } },
        ],
      },
      {
        $or: [
          { verificationClaimExpiresAt: { $exists: false } },
          { verificationClaimExpiresAt: { $lte: now } },
        ],
      },
    ],
  };

  const expired = await PendingUser.find(safeToRemove)
    .select("_id profileImage profileImagePublicId registrationExpiresAt createdAt")
    .limit(SWEEP_LIMIT)
    .lean();

  for (const pendingUser of expired) {
    const removed = await PendingUser.deleteOne({ _id: pendingUser._id, ...safeToRemove });
    if (!removed.deletedCount) continue;
    await removePendingProfileImageIfUnused(pendingUser).catch(logCleanupError);
  }
};

const scheduleNextSweep = () => {
  if (!started) return;
  timer = setTimeout(() => {
    activeSweep = cleanupExpiredPendingSignups()
      .catch(logCleanupError)
      .finally(() => {
        activeSweep = null;
        scheduleNextSweep();
      });
  }, SWEEP_INTERVAL_MS);
  timer.unref?.();
};

export const startPendingSignupCleanup = () => {
  if (started) return;
  started = true;
  activeSweep = cleanupExpiredPendingSignups()
    .catch(logCleanupError)
    .finally(() => {
      activeSweep = null;
      scheduleNextSweep();
    });
};

export const stopPendingSignupCleanup = async () => {
  started = false;
  clearTimeout(timer);
  timer = null;
  await activeSweep?.catch(() => {});
};
