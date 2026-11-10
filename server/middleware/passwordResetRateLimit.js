import { createHash } from "crypto";

const WINDOW_MS = 15 * 60 * 1000;
const requestBuckets = new Map();
const resetBuckets = new Map();
const MAX_BUCKET_ENTRIES = 20000;
const NEUTRAL_RESPONSE =
  "If an account exists with this email address, password reset instructions will be sent.";

const incrementBucket = (buckets, key, limit, now = Date.now()) => {
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
    while (buckets.size > MAX_BUCKET_ENTRIES) {
      buckets.delete(buckets.keys().next().value);
    }
  }
  bucket.count += 1;
  return bucket.count > limit;
};

const limitPasswordResetRequests = (req, res, next) => {
  const ip = req.ip || "unknown-ip";
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const emailKey = email
    ? createHash("sha256").update(email).digest("hex")
    : "missing-email";

  const limitedByIp = incrementBucket(requestBuckets, `ip:${ip}`, 5);
  const limitedByEmail = incrementBucket(requestBuckets, `email:${emailKey}`, 3);
  if (limitedByIp || limitedByEmail) {
    return res.status(202).json({ message: NEUTRAL_RESPONSE });
  }
  return next();
};

const limitPasswordResetCompletions = (req, res, next) => {
  const ip = req.ip || "unknown-ip";
  if (incrementBucket(resetBuckets, ip, 10)) {
    return res.status(429).json({ message: "Too many reset attempts. Try again later." });
  }
  return next();
};

export { limitPasswordResetRequests, limitPasswordResetCompletions };
