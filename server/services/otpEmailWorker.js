import { randomUUID } from "crypto";

import PendingUser from "../model/pendingUser.js";
import sendOTP from "../utils/otpSender.js";
import { decryptOtp, otpEncryptionConfigured } from "../utils/otpCrypto.js";
import { removePendingProfileImageIfUnused } from "../utils/pendingProfileImageCleanup.js";

const MAX_ATTEMPTS = 5;
const LEASE_MS = 60_000;
const IDLE_POLL_MS = 5_000;
const MAX_RETRY_DELAY_MS = 15 * 60_000;
const OTP_LIFETIME_MS = 2 * 60_000;
const PENDING_SIGNUP_LIFETIME_MS = 24 * 60 * 60_000;
const EXPIRY_SWEEP_INTERVAL_MS = 5 * 60_000;

let started = false;
let stopping = false;
let timer = null;
let cyclePromise = null;
let activeWork = null;
let lastExpirySweepAt = 0;

const logWorkerError = (error, jobId) => {
  console.error("OTP email worker operation failed:", {
    jobId: jobId || null,
    code: error?.code || null,
    name: error?.name || "Error",
  });
};

const expireExhaustedLeases = async (now) => {
  await PendingUser.updateMany(
    {
      "emailDelivery.status": "processing",
      "emailDelivery.lockedUntil": { $lte: now },
      $expr: {
        $gte: ["$emailDelivery.attempts", "$emailDelivery.maxAttempts"],
      },
    },
    {
      $set: {
        "emailDelivery.status": "failed",
        "emailDelivery.failedAt": now,
        "emailDelivery.lastErrorCode": "ATTEMPTS_EXHAUSTED",
      },
      $unset: {
        "emailDelivery.encryptedOtp": 1,
        "emailDelivery.otpIv": 1,
        "emailDelivery.otpAuthTag": 1,
        "emailDelivery.lockedUntil": 1,
        "emailDelivery.workerId": 1,
      },
    },
  );
};

const claimNextJob = async () => {
  const now = new Date();
  const workerId = randomUUID();
  return PendingUser.findOneAndUpdate(
    {
      registrationExpiresAt: { $gt: now },
      $or: [
        {
          "emailDelivery.status": "queued",
          "emailDelivery.nextAttemptAt": { $lte: now },
          $expr: { $lt: ["$emailDelivery.attempts", "$emailDelivery.maxAttempts"] },
        },
        {
          "emailDelivery.status": "processing",
          "emailDelivery.lockedUntil": { $lte: now },
          $expr: { $lt: ["$emailDelivery.attempts", "$emailDelivery.maxAttempts"] },
        },
      ],
    },
    {
      $set: {
        "emailDelivery.status": "processing",
        "emailDelivery.workerId": workerId,
        "emailDelivery.lockedUntil": new Date(now.getTime() + LEASE_MS),
      },
      $inc: { "emailDelivery.attempts": 1 },
    },
    {
      sort: { "emailDelivery.nextAttemptAt": 1, createdAt: 1 },
      returnDocument: "after",
    },
  ).lean();
};

const cleanupExpiredPendingSignups = async (now) => {
  const legacyCutoff = new Date(now.getTime() - PENDING_SIGNUP_LIFETIME_MS);
  const expiryFilter = {
    $or: [
      { registrationExpiresAt: { $lte: now } },
      {
        registrationExpiresAt: { $exists: false },
        createdAt: { $lte: legacyCutoff },
      },
    ],
  };
  const availableFilter = {
    $and: [
      expiryFilter,
      {
        $or: [
          { verificationClaimExpiresAt: { $exists: false } },
          { verificationClaimExpiresAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { "emailDelivery.status": { $ne: "processing" } },
          { "emailDelivery.lockedUntil": { $exists: false } },
          { "emailDelivery.lockedUntil": { $lte: now } },
        ],
      },
    ],
  };

  const expired = await PendingUser.find(availableFilter)
    .select("_id profileImage profileImagePublicId registrationExpiresAt createdAt")
    .limit(50)
    .lean();

  for (const pendingUser of expired) {
    const removed = await PendingUser.deleteOne({ _id: pendingUser._id, ...availableFilter });
    if (!removed.deletedCount) continue;
    await removePendingProfileImageIfUnused(pendingUser).catch((error) => {
      logWorkerError(error);
    });
  }
};

const failOrRetryJob = async (job, error) => {
  const attempts = job.emailDelivery?.attempts || 1;
  const responseCode = Number(error?.responseCode);
  const permanentFailure =
    error?.code === "EAUTH" ||
    error?.code === "ERECIPIENTREJECTED" ||
    responseCode >= 500;
  const retry = !permanentFailure && attempts < (job.emailDelivery?.maxAttempts || MAX_ATTEMPTS);
  const now = new Date();
  const retryDelay = Math.min(
    15_000 * 2 ** Math.max(0, attempts - 1),
    MAX_RETRY_DELAY_MS,
  );
  const safeCode = /^[A-Za-z0-9_-]{1,48}$/.test(error?.code || "")
    ? error.code
    : "EMAIL_DELIVERY_ERROR";

  await PendingUser.updateOne(
    {
      _id: job._id,
      "emailDelivery.jobId": job.emailDelivery.jobId,
      "emailDelivery.workerId": job.emailDelivery.workerId,
      "emailDelivery.status": "processing",
    },
    {
      $set: {
        "emailDelivery.status": retry ? "queued" : "failed",
        "emailDelivery.nextAttemptAt": retry ? new Date(now.getTime() + retryDelay) : now,
        "emailDelivery.failedAt": retry ? null : now,
        "emailDelivery.lastErrorCode": safeCode,
      },
      $unset: {
        "emailDelivery.lockedUntil": 1,
        "emailDelivery.workerId": 1,
        ...(!retry
          ? {
              "emailDelivery.encryptedOtp": 1,
              "emailDelivery.otpIv": 1,
              "emailDelivery.otpAuthTag": 1,
            }
          : {}),
      },
    },
  );
};

const deliverJob = async (job) => {
  const startedAt = Date.now();
  const { emailDelivery } = job;
  try {
    if (!emailDelivery?.encryptedOtp || !emailDelivery.otpIv || !emailDelivery.otpAuthTag) {
      throw Object.assign(new Error("OTP email payload is unavailable"), {
        code: "OTP_PAYLOAD_UNAVAILABLE",
      });
    }
    const otp = decryptOtp(emailDelivery);
    await sendOTP(job.email, otp);
    const sentAt = new Date();
    await PendingUser.updateOne(
      {
        _id: job._id,
        "emailDelivery.jobId": emailDelivery.jobId,
        "emailDelivery.workerId": emailDelivery.workerId,
        "emailDelivery.status": "processing",
      },
      {
        $set: {
          "emailDelivery.status": "sent",
          "emailDelivery.sentAt": sentAt,
          "emailDelivery.lastErrorCode": null,
          otpExpires: new Date(sentAt.getTime() + OTP_LIFETIME_MS),
        },
        $unset: {
          "emailDelivery.encryptedOtp": 1,
          "emailDelivery.otpIv": 1,
          "emailDelivery.otpAuthTag": 1,
          "emailDelivery.lockedUntil": 1,
          "emailDelivery.workerId": 1,
        },
      },
    );
    console.info("OTP email job sent to SMTP:", {
      jobId: emailDelivery.jobId,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    await failOrRetryJob(job, error);
    const responseCode = Number(error?.responseCode);
    const permanentFailure =
      error?.code === "EAUTH" ||
      error?.code === "ERECIPIENTREJECTED" ||
      responseCode >= 500;
    console.warn("OTP email job failed:", {
      jobId: emailDelivery?.jobId || null,
      code: error?.code || "EMAIL_DELIVERY_ERROR",
      durationMs: Date.now() - startedAt,
      retryScheduled:
        (emailDelivery?.attempts || 1) < (emailDelivery?.maxAttempts || MAX_ATTEMPTS) &&
        !permanentFailure,
    });
  }
};

const schedule = (delay = 0) => {
  if (stopping) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    cyclePromise = runCycle().finally(() => {
      cyclePromise = null;
    });
  }, delay);
  timer.unref?.();
};

const runCycle = async () => {
  if (stopping) return;
  try {
    const now = new Date();
    await expireExhaustedLeases(now);
    if (Date.now() - lastExpirySweepAt >= EXPIRY_SWEEP_INTERVAL_MS) {
      lastExpirySweepAt = Date.now();
      await cleanupExpiredPendingSignups(now);
    }

    const job = await claimNextJob();
    if (!job) {
      schedule(IDLE_POLL_MS);
      return;
    }

    activeWork = deliverJob(job);
    await activeWork;
    activeWork = null;
    schedule(0);
  } catch (error) {
    logWorkerError(error);
    schedule(IDLE_POLL_MS);
  }
};

export const startOtpEmailWorker = () => {
  if (started) return;
  started = true;
  stopping = false;
  if (!otpEncryptionConfigured()) {
    console.error("OTP email worker is disabled: encryption key is not configured");
    return;
  }
  schedule(0);
};

export const stopOtpEmailWorker = async () => {
  stopping = true;
  clearTimeout(timer);
  timer = null;
  await cyclePromise?.catch(() => {});
  await activeWork?.catch(() => {});
  activeWork = null;
  started = false;
};
