import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "crypto";

let cachedKeys;

const getKeys = () => {
  if (cachedKeys) return cachedKeys;

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

  cachedKeys = {
    encryption: Buffer.from(
      hkdfSync("sha256", sourceKey, "ems-otp-v1", "outbox-encryption", 32),
    ),
    hashing: Buffer.from(
      hkdfSync("sha256", sourceKey, "ems-otp-v1", "otp-verification-hash", 32),
    ),
  };
  return cachedKeys;
};

export const otpEncryptionConfigured = () => {
  try {
    getKeys();
    return true;
  } catch {
    return false;
  }
};

export const hashOtp = (otp, salt) =>
  createHmac("sha256", getKeys().hashing)
    .update(`${salt}:${otp}`)
    .digest("hex");

export const verifyOtpHash = (otp, salt, storedHash) => {
  if (!salt || typeof storedHash !== "string") return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashOtp(otp, salt), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const hashSignupToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const createSignupToken = () => randomBytes(32).toString("base64url");

export const encryptOtp = (otp) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKeys().encryption, iv);
  const ciphertext = Buffer.concat([
    cipher.update(otp, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedOtp: ciphertext.toString("base64"),
    otpIv: iv.toString("base64"),
    otpAuthTag: cipher.getAuthTag().toString("base64"),
  };
};

export const decryptOtp = ({ encryptedOtp, otpIv, otpAuthTag }) => {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKeys().encryption,
    Buffer.from(otpIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(otpAuthTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedOtp, "base64")),
    decipher.final(),
  ]).toString("utf8");
};
