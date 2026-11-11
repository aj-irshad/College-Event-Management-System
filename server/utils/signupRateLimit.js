import { createHash } from "crypto";

const WINDOW_MS = 15 * 60_000;
const MAX_SIGNUP_ATTEMPTS = 6;
const MAX_BUCKETS = 10_000;
const attemptsByEmail = new Map();

export const consumeSignupAttempt = (email, now = Date.now()) => {
  for (const [key, value] of attemptsByEmail) {
    if (value.resetAt <= now) attemptsByEmail.delete(key);
  }

  const emailKey = createHash("sha256").update(email).digest("hex");
  let bucket = attemptsByEmail.get(emailKey);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    attemptsByEmail.set(emailKey, bucket);
    while (attemptsByEmail.size > MAX_BUCKETS) {
      attemptsByEmail.delete(attemptsByEmail.keys().next().value);
    }
  }

  bucket.count += 1;
  if (bucket.count <= MAX_SIGNUP_ATTEMPTS) return 0;
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
};
