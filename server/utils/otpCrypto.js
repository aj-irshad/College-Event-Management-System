import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "crypto";

let cachedHashingKey;

const getHashingKey = () => {
  if (cachedHashingKey) return cachedHashingKey;

  let sourceKey;
  const configuredKey = process.env.OTP_ENCRYPTION_KEY;
  if (configuredKey) {
    sourceKey = Buffer.from(configuredKey, "base64");
    if (sourceKey.length !== 32) {
      throw new Error("OTP_ENCRYPTION_KEY must be a base64 encoded 32-byte key");
    }
  } else if (process.env.NODE_ENV !== "production" && process.env.JWT_KEY) {
    sourceKey = Buffer.from(
      hkdfSync("sha256", Buffer.from(process.env.JWT_KEY), "ems-local", "otp-outbox-root", 32),
    );
  } else {
    throw new Error("OTP_ENCRYPTION_KEY is not configured");
  }

  cachedHashingKey = Buffer.from(
    hkdfSync("sha256", sourceKey, "ems-otp-v1", "otp-verification-hash", 32),
  );
  return cachedHashingKey;
};

export const otpHashingConfigured = () => {
  try {
    getHashingKey();
    return true;
  } catch {
    return false;
  }
};

export const hashOtp = (otp, salt) =>
  createHmac("sha256", getHashingKey())
    .update(`${salt}:${otp}`)
    .digest("hex");

export const verifyOtpHash = (otp, salt, storedHash) => {
  if (!salt || typeof storedHash !== "string") return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashOtp(otp, salt), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
