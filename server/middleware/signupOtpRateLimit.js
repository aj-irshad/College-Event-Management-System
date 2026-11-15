import { createHash } from "crypto";
import fs from "fs/promises";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 20_000;
const buckets = new Map();
let requestsSinceCleanup = 0;

const consume = (key, limit, now = Date.now()) => {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 256 || buckets.size > MAX_ENTRIES) {
    requestsSinceCleanup = 0;
    for (const [bucketKey, current] of buckets) {
      if (current.resetAt <= now) buckets.delete(bucketKey);
    }
    while (buckets.size > MAX_ENTRIES) {
      buckets.delete(buckets.keys().next().value);
    }
  }

  return bucket.count > limit ? Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) : 0;
};

const makeRateLimit = ({ action, ipLimit, accountLimit }) => (req, res, next) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const ip = req.ip || req.socket?.remoteAddress || "unknown-ip";
  const emailKey = email
    ? createHash("sha256").update(email).digest("hex")
    : null;

  const ipRetryAfter = consume(`${action}:ip:${ip}`, ipLimit);
  const accountRetryAfter = emailKey
    ? consume(`${action}:account:${emailKey}`, accountLimit)
    : 0;
  const retryAfter = Math.max(ipRetryAfter, accountRetryAfter);

  if (retryAfter) {
    if (req.file?.path) void fs.unlink(req.file.path).catch(() => {});
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many requests. Please wait before trying again.",
      retryAfterSeconds: retryAfter,
    });
  }
  return next();
};

export const limitSignupByIp = makeRateLimit({ action: "signup", ipLimit: 20, accountLimit: 5 });
export const limitVerifyOtp = makeRateLimit({ action: "otp-verify", ipLimit: 30, accountLimit: 10 });
export const limitResendOtp = makeRateLimit({ action: "otp-resend", ipLimit: 10, accountLimit: 5 });
export const limitSignupByAccount = makeRateLimit({ action: "signup-account", ipLimit: 20, accountLimit: 5 });
