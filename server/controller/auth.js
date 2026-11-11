import fs from "fs/promises";
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "crypto";

import Users from "../model/user.js";
import PendingUser from "../model/pendingUser.js";

import {
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import { setUser } from "../services/auth.js";
import { createHashPassword, compareHashPassword } from "../services/bcrypt.js";
import { sendPasswordResetEmail } from "../utils/otpSender.js";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "../utils/eventTargeting.js";
import {
  createSignupToken,
  encryptOtp,
  hashOtp,
  hashSignupToken,
  otpEncryptionConfigured,
  verifyOtpHash,
} from "../utils/otpCrypto.js";
import { removePendingProfileImageIfUnused } from "../utils/pendingProfileImageCleanup.js";
import { consumeSignupAttempt } from "../utils/signupRateLimit.js";

const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000;
const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "If an account exists with this email address, password reset instructions will be sent.";
const PENDING_SIGNUP_LIFETIME_MS = 24 * 60 * 60_000;
const OTP_RESEND_COOLDOWN_MS = 60_000;
const SIGNUP_TOKEN_ROTATION_COOLDOWN_MS = 60_000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_RESENDS = 5;
const EMAIL_JOB_MAX_ATTEMPTS = 5;
const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};
const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`]{8,16}$/;

const requestPasswordReset = async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  try {
    const user = await Users.findOne({ email });
    if (user) {
      const frontendOrigin = new URL(process.env.VITE_BASE_URL);
      if (!["http:", "https:"].includes(frontendOrigin.protocol)) {
        throw new Error("Invalid frontend URL configuration");
      }

      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = expiresAt;
      await user.save();

      const resetUrl = new URL(
        `/reset-password/${encodeURIComponent(token)}`,
        frontendOrigin.origin,
      ).toString();
      void sendPasswordResetEmail(email, resetUrl, 20).catch(async () => {
        await Users.updateOne(
          { _id: user._id, passwordResetTokenHash: tokenHash },
          { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
        ).catch(() => {});
        console.error("Password reset email delivery failed");
      });
    }
  } catch {
    // Keep the response identical for absent accounts and mail/config failures.
    console.error("Password reset request could not be processed");
  }

  return res.status(202).json({ message: PASSWORD_RESET_NEUTRAL_MESSAGE });
};

const completePasswordReset = async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return res
      .status(400)
      .json({ message: "This password reset link is invalid or expired." });
  }
  if (typeof newPassword !== "string" || !PASSWORD_RULE.test(newPassword)) {
    return res.status(400).json({
      message:
        "Password must be 8–16 characters with uppercase, lowercase, number and special character.",
    });
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const passwordHash = await createHashPassword(newPassword);
    const consumedUser = await Users.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: { password: passwordHash },
        $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
      },
      { returnDocument: "before" },
    )
      .select("_id")
      .lean();

    if (!consumedUser) {
      return res
        .status(400)
        .json({ message: "This password reset link is invalid or expired." });
    }

    return res
      .status(200)
      .json({ message: "Password reset successful. Please log in." });
  } catch {
    console.error("Password reset could not be completed");
    return res
      .status(500)
      .json({ message: "Could not reset your password. Please try again." });
  }
};

// TEST API FOR ALL USER
const testAPI = async (req, res) => {
  const allUser = await Users.find();

  if (!allUser || allUser.length === 0) {
    return res.json({
      msg: "No user found",
    });
  }

  res.json({
    userCount: allUser.length,
    users: allUser.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
    })),
  });
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await Users.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({
        msg: "User not exist. Please sign up",
      });
    }

    const matchPassword = await compareHashPassword(password, user.password);

    if (!matchPassword) {
      return res.status(401).json({
        msg: "Invalid credentials",
      });
    }

    const token = setUser(user);

    const cookieOptions = {
      ...getAuthCookieOptions(),
      maxAge: 24 * 60 * 60 * 1000,
    };

    res.cookie("ems", token, cookieOptions);

    return res.status(200).json({
      msg: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      msg: "Internal server error",
    });
  }
};

const createOtpEmailJob = (otp, now = new Date()) => ({
  jobId: randomUUID(),
  status: "queued",
  ...encryptOtp(otp),
  attempts: 0,
  maxAttempts: EMAIL_JOB_MAX_ATTEMPTS,
  nextAttemptAt: now,
  queuedAt: now,
});

const pendingDeliveryStatus = (pendingUser) => {
  if (pendingUser.emailDelivery?.status) return pendingUser.emailDelivery.status;
  return pendingUser.otp ? "sent" : "queued";
};

const registrationExpiry = (pendingUser) =>
  pendingUser.registrationExpiresAt ||
  new Date(new Date(pendingUser.createdAt || Date.now()).getTime() + PENDING_SIGNUP_LIFETIME_MS);

const deliveryStatusResponse = (pendingUser, now = new Date()) => ({
  status: pendingDeliveryStatus(pendingUser),
  resendAfterSeconds: Math.max(
    0,
    Math.ceil(((pendingUser.resendAvailableAt?.getTime?.() || 0) - now.getTime()) / 1000),
  ),
  otpExpiresAt: pendingUser.otpExpires || null,
});

const userSignUp = async (req, res) => {
  const signupStartedAt = Date.now();
  const requestId = req.requestId || randomUUID();
  const timings = {};
  let uploadedImage = null;
  let pendingUserSaved = false;
  let pendingUserWriteAttempted = false;

  try {
    const validationStartedAt = Date.now();
    const { name, password, contact, department, semester } = req.body || {};
    const email = typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (!EVENT_SEMESTERS.includes(semester)) {
      return res.status(400).json({ message: "Select a valid semester." });
    }
    if (!EVENT_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Select a valid department." });
    }
    timings.validationMs = Date.now() - validationStartedAt;

    const signupRetryAfter = consumeSignupAttempt(email);
    if (signupRetryAfter) {
      return res.status(429).json({
        message: "Too many signup attempts for this address. Please try again later.",
        retryAfterSeconds: signupRetryAfter,
      });
    }

    if (!otpEncryptionConfigured()) {
      return res.status(503).json({
        message: "Email verification is temporarily unavailable. Please try again later.",
      });
    }

    let stageStartedAt = Date.now();
    const existingUser = await Users.findOne({ email }).select("_id").lean();
    timings.userLookupMs = Date.now() - stageStartedAt;
    if (existingUser) {
      return res.status(400).json({ message: "User already exists. Please login." });
    }

    stageStartedAt = Date.now();
    const previousPendingUser = await PendingUser.findOne({ email }).lean();
    timings.pendingUserLookupMs = Date.now() - stageStartedAt;
    const now = new Date();
    if (previousPendingUser && registrationExpiry(previousPendingUser) > now) {
      const signupToken = createSignupToken();
      const rotatedToken = await PendingUser.findOneAndUpdate(
        {
          _id: previousPendingUser._id,
          $or: [
            { signupTokenRotatedAt: { $exists: false } },
            { signupTokenRotatedAt: { $lte: new Date(now.getTime() - SIGNUP_TOKEN_ROTATION_COOLDOWN_MS) } },
          ],
        },
        {
          $set: {
            signupTokenHash: hashSignupToken(signupToken),
            signupTokenRotatedAt: now,
          },
        },
        { returnDocument: "after" },
      ).lean();

      if (!rotatedToken) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(
            (previousPendingUser.signupTokenRotatedAt.getTime() +
              SIGNUP_TOKEN_ROTATION_COOLDOWN_MS -
              now.getTime()) / 1000,
          ),
        );
        return res.status(429).json({
          message: "A signup is already pending. Continue from the verification page or try again shortly.",
          retryAfterSeconds,
        });
      }

      return res.status(202).json({
        message: "A signup is already pending. Continue verification or request a new code.",
        email,
        signupToken,
        deliveryStatus: pendingDeliveryStatus(rotatedToken),
        ...deliveryStatusResponse(rotatedToken, now),
      });
    }

    if (previousPendingUser) {
      const removed = await PendingUser.deleteOne({ _id: previousPendingUser._id });
      if (removed.deletedCount) {
        void removePendingProfileImageIfUnused(previousPendingUser).catch(() => {
          console.error("Expired pending profile image cleanup failed");
        });
      }
    }

    const localCloudinaryFallback =
      process.env.NODE_ENV !== "production" &&
      !process.env.CLOUDINARY_CLOUD_NAME &&
      !process.env.CLOUDINARY_API_KEY &&
      !process.env.CLOUDINARY_API_SECRET;

    if (req.file && localCloudinaryFallback) {
      uploadedImage = { url: req.file.filename, publicId: "", isLocal: true };
    } else if (req.file) {
      stageStartedAt = Date.now();
      try {
        uploadedImage = await uploadToCloudinary(req.file.path, "profiles", {
          timeout: 30_000,
        });
      } finally {
        timings.cloudinaryUploadMs = Date.now() - stageStartedAt;
      }
    }

    stageStartedAt = Date.now();
    const hashedPassword = await createHashPassword(password);
    timings.passwordHashMs = Date.now() - stageStartedAt;

    stageStartedAt = Date.now();
    const otp = randomInt(1000, 10_000).toString();
    const otpSalt = randomBytes(16).toString("hex");
    const otpHash = hashOtp(otp, otpSalt);
    const signupToken = createSignupToken();
    const emailDelivery = createOtpEmailJob(otp, now);
    timings.otpGenerationAndProtectionMs = Date.now() - stageStartedAt;

    stageStartedAt = Date.now();
    pendingUserWriteAttempted = true;
    const savedPendingUser = await PendingUser.create({
      name,
      email,
      password: hashedPassword,
      contact,
      department,
      semester,
      profileImage: uploadedImage?.url || "",
      profileImagePublicId: uploadedImage?.publicId || "",
      otpHash,
      otpSalt,
      otpAttempts: 0,
      otpResendCount: 0,
      otpExpires: null,
      signupTokenHash: hashSignupToken(signupToken),
      signupTokenRotatedAt: now,
      registrationExpiresAt: new Date(now.getTime() + PENDING_SIGNUP_LIFETIME_MS),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
      emailDelivery,
    });
    pendingUserSaved = Boolean(savedPendingUser);
    timings.queuePersistenceMs = Date.now() - stageStartedAt;
    console.info("Signup pending record and OTP email job persisted:", {
      requestId,
      jobId: emailDelivery.jobId,
      queuePersistenceMs: timings.queuePersistenceMs,
    });

    return res.status(202).json({
      message: "Signup saved. Your verification email has been queued, not delivered yet.",
      email,
      signupToken,
      deliveryStatus: "queued",
      resendAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    if (!pendingUserSaved && uploadedImage?.url) {
      const writeDefinitelyDidNotCommit =
        !pendingUserWriteAttempted ||
        error.code === 11000 ||
        error.name === "ValidationError";
      await removePendingProfileImageIfUnused(
        {
          profileImage: uploadedImage.url,
          profileImagePublicId: uploadedImage.publicId,
        },
        { writeDefinitelyDidNotCommit },
      ).catch(() => {
        console.error("Could not safely clean up the signup profile image");
      });
    }

    console.error("Signup request failed:", {
      requestId,
      name: error.name || "Error",
      code: error.code || null,
    });
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A signup is already pending for this email. Continue from the verification page.",
      });
    }
    return res.status(500).json({ message: "Signup could not be saved. Please try again." });
  } finally {
    if (req.file?.path && !uploadedImage?.isLocal) {
      const cleanupStartedAt = Date.now();
      await fs.unlink(req.file.path).catch(() => {});
      timings.temporaryFileCleanupMs = Date.now() - cleanupStartedAt;
    }

    timings.controllerTotalMs = Date.now() - signupStartedAt;
    if (timings.controllerTotalMs >= 5_000) {
      console.warn("Slow signup controller stages (ms):", { requestId, ...timings });
    }
  }
};

const getOtpDeliveryStatus = async (req, res) => {
  const signupToken = req.body?.signupToken;
  if (typeof signupToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(signupToken)) {
    return res.status(400).json({ message: "Signup verification session is invalid." });
  }

  try {
    const pendingUser = await PendingUser.findOne({
      signupTokenHash: hashSignupToken(signupToken),
    }).lean();
    if (!pendingUser) return res.status(404).json({ message: "Signup request not found." });
    if (registrationExpiry(pendingUser) <= new Date()) {
      return res.status(410).json({ message: "Signup request expired. Please sign up again." });
    }

    return res.status(200).json({
      message: "Email status retrieved.",
      ...deliveryStatusResponse(pendingUser),
    });
  } catch (error) {
    console.error("OTP delivery status lookup failed:", { code: error.code || null });
    return res.status(500).json({ message: "Could not retrieve email status." });
  }
};

const resendOTP = async (req, res) => {
  const signupToken = req.body?.signupToken;
  const legacyEmail = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const tokenValid = typeof signupToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(signupToken);
  if (!tokenValid && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legacyEmail)) {
    return res.status(400).json({ message: "Signup verification session is invalid." });
  }
  if (!otpEncryptionConfigured()) {
    return res.status(503).json({ message: "Email verification is temporarily unavailable." });
  }

  try {
    const lookup = tokenValid
      ? { signupTokenHash: hashSignupToken(signupToken) }
      : { email: legacyEmail, signupTokenHash: { $exists: false } };
    const pendingUser = await PendingUser.findOne(lookup).lean();
    if (!pendingUser) return res.status(404).json({ message: "Signup request not found." });

    const now = new Date();
    if (registrationExpiry(pendingUser) <= now) {
      return res.status(410).json({ message: "Signup request expired. Please sign up again." });
    }
    if (pendingUser.otpResendCount >= MAX_OTP_RESENDS) {
      return res.status(429).json({ message: "The resend limit was reached. Please start signup again." });
    }
    if (pendingUser.resendAvailableAt > now) {
      return res.status(429).json({
        message: "Please wait before requesting another verification code.",
        retryAfterSeconds: Math.ceil((pendingUser.resendAvailableAt - now) / 1000),
      });
    }
    if (pendingUser.verificationClaimExpiresAt > now) {
      return res.status(409).json({ message: "Verification is already being completed." });
    }
    if (
      pendingUser.emailDelivery?.status === "processing" &&
      pendingUser.emailDelivery.lockedUntil > now
    ) {
      return res.status(409).json({ message: "The verification email is currently being sent." });
    }

    const otp = randomInt(1000, 10_000).toString();
    const otpSalt = randomBytes(16).toString("hex");
    const otpHash = hashOtp(otp, otpSalt);
    const emailDelivery = createOtpEmailJob(otp, now);
    const newSignupToken = tokenValid ? signupToken : createSignupToken();
    const identityFilter = tokenValid
      ? { signupTokenHash: hashSignupToken(signupToken) }
      : { email: legacyEmail, signupTokenHash: { $exists: false } };
    const updatedPending = await PendingUser.findOneAndUpdate(
      {
        _id: pendingUser._id,
        ...identityFilter,
        $and: [
          {
            $or: [
              { registrationExpiresAt: { $gt: now } },
              {
                registrationExpiresAt: { $exists: false },
                createdAt: { $gt: new Date(now.getTime() - PENDING_SIGNUP_LIFETIME_MS) },
              },
            ],
          },
          {
            $or: [
              { otpResendCount: { $lt: MAX_OTP_RESENDS } },
              { otpResendCount: { $exists: false } },
            ],
          },
          {
            $or: [
              { resendAvailableAt: { $exists: false } },
              { resendAvailableAt: { $lte: now } },
            ],
          },
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
      },
      {
        $set: {
          otpHash,
          otpSalt,
          otpAttempts: 0,
          otpExpires: null,
          resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS),
          signupTokenHash: hashSignupToken(newSignupToken),
          emailDelivery,
        },
        $inc: { otpResendCount: 1 },
        $unset: { otp: 1, verificationClaimId: 1, verificationClaimExpiresAt: 1 },
      },
      { returnDocument: "after", runValidators: true },
    ).lean();

    if (!updatedPending) {
      const current = await PendingUser.findOne(lookup)
        .select("resendAvailableAt")
        .lean();
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(((current?.resendAvailableAt?.getTime?.() || now.getTime()) - now.getTime()) / 1000),
      );
      return res.status(429).json({
        message: "Please wait before requesting another verification code.",
        retryAfterSeconds,
      });
    }

    return res.status(202).json({
      message: "A new verification email has been queued, not delivered yet.",
      deliveryStatus: "queued",
      signupToken: newSignupToken,
      resendAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    console.error("OTP resend request failed:", { code: error.code || null });
    return res.status(500).json({ message: "Could not queue a new verification email." });
  }
};

const verifyOTP = async (req, res) => {
  const requestId = req.requestId || randomUUID();
  const verificationStartedAt = Date.now();
  const timings = {};
  let claimId = null;
  let claimedPendingUser = null;

  try {
    const { otp } = req.body || {};
    const signupToken = req.body?.signupToken;
    const email = typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
    if (typeof otp !== "string" || !/^\d{4}$/.test(otp)) {
      return res.status(400).json({ message: "Enter the 4-digit verification code." });
    }

    const tokenValid = typeof signupToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(signupToken);
    if (!tokenValid && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Signup verification session is invalid." });
    }

    const identityFilter = tokenValid
      ? { signupTokenHash: hashSignupToken(signupToken), ...(email ? { email } : {}) }
      : { email, signupTokenHash: { $exists: false } };
    let stageStartedAt = Date.now();
    const pendingUser = await PendingUser.findOne(identityFilter).lean();
    timings.pendingLookupMs = Date.now() - stageStartedAt;
    if (!pendingUser) return res.status(404).json({ message: "Signup request not found." });

    const now = new Date();
    if (registrationExpiry(pendingUser) <= now) {
      return res.status(410).json({ message: "Signup request expired. Please sign up again." });
    }
    if (pendingUser.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect codes. Request a new code to continue." });
    }
    const deliveryStatus = pendingDeliveryStatus(pendingUser);
    if (deliveryStatus === "queued" || deliveryStatus === "processing") {
      return res.status(409).json({ message: "Your verification email is still being sent. Please wait." });
    }
    if (deliveryStatus === "failed") {
      return res.status(409).json({ message: "The verification email could not be sent. Request a new code." });
    }
    if (!pendingUser.otpExpires || new Date(pendingUser.otpExpires) <= now) {
      return res.status(400).json({ message: "The verification code expired. Request a new code." });
    }

    stageStartedAt = Date.now();
    const codeMatches = pendingUser.otpHash
      ? verifyOtpHash(otp, pendingUser.otpSalt, pendingUser.otpHash)
      : (() => {
          const expected = Buffer.from(String(pendingUser.otp || ""));
          const actual = Buffer.from(otp);
          return expected.length === actual.length && timingSafeEqual(expected, actual);
        })();
    timings.codeCheckMs = Date.now() - stageStartedAt;

    const otpIdentity = pendingUser.otpHash
      ? { otpHash: pendingUser.otpHash }
      : { otp: pendingUser.otp };
    const registrationFilter = pendingUser.registrationExpiresAt
      ? { registrationExpiresAt: { $gt: now } }
      : { createdAt: { $gt: new Date(now.getTime() - PENDING_SIGNUP_LIFETIME_MS) } };
    if (!codeMatches) {
      const attempt = await PendingUser.findOneAndUpdate(
        {
          _id: pendingUser._id,
          ...otpIdentity,
          ...registrationFilter,
          $and: [
            {
              $or: [
                { otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
                { otpAttempts: { $exists: false } },
              ],
            },
            tokenValid ? { signupTokenHash: hashSignupToken(signupToken) } : { signupTokenHash: { $exists: false } },
            {
              $or: [
                { verificationClaimExpiresAt: { $exists: false } },
                { verificationClaimExpiresAt: { $lte: now } },
              ],
            },
          ],
        },
        { $inc: { otpAttempts: 1 } },
        { returnDocument: "after" },
      ).select("otpAttempts").lean();
      if (!attempt) return res.status(409).json({ message: "Verification changed. Please try again." });
      if (attempt.otpAttempts >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({ message: "Too many incorrect codes. Request a new code to continue." });
      }
      return res.status(400).json({ message: "Invalid verification code." });
    }

    claimId = randomUUID();
    stageStartedAt = Date.now();
    claimedPendingUser = await PendingUser.findOneAndUpdate(
      {
        _id: pendingUser._id,
        ...otpIdentity,
        otpExpires: { $gt: now },
        ...registrationFilter,
        $and: [
          {
            $or: [
              { otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
              { otpAttempts: { $exists: false } },
            ],
          },
          tokenValid ? { signupTokenHash: hashSignupToken(signupToken) } : { signupTokenHash: { $exists: false } },
          {
            $or: [
              { verificationClaimExpiresAt: { $exists: false } },
              { verificationClaimExpiresAt: { $lte: now } },
            ],
          },
        ],
      },
      {
        $set: {
          verificationClaimId: claimId,
          verificationClaimExpiresAt: new Date(now.getTime() + 60_000),
        },
      },
      { returnDocument: "after" },
    ).lean();
    timings.verificationClaimMs = Date.now() - stageStartedAt;
    if (!claimedPendingUser) {
      return res.status(409).json({ message: "Verification is already in progress. Please wait." });
    }

    const newUser = {
      name: claimedPendingUser.name,
      email: claimedPendingUser.email,
      password: claimedPendingUser.password,
      contact: claimedPendingUser.contact,
      department: claimedPendingUser.department,
      semester: claimedPendingUser.semester,
      profileImage: claimedPendingUser.profileImage,
      profileImagePublicId: claimedPendingUser.profileImagePublicId || "",
    };

    stageStartedAt = Date.now();
    try {
      await Users.findOneAndUpdate(
        { email: claimedPendingUser.email },
        { $setOnInsert: newUser },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      const alreadyCreated = await Users.exists({ email: claimedPendingUser.email });
      if (!alreadyCreated) throw error;
    }
    timings.userUpsertMs = Date.now() - stageStartedAt;

    stageStartedAt = Date.now();
    const removedPending = await PendingUser.deleteOne({
      _id: claimedPendingUser._id,
      verificationClaimId: claimId,
    });
    timings.pendingDeleteMs = Date.now() - stageStartedAt;
    if (removedPending.deletedCount) {
      void removePendingProfileImageIfUnused(claimedPendingUser).catch(() => {
        console.error("Verified signup image cleanup failed");
      });
    }

    return res.status(200).json({ message: "Account successfully created. Please log in." });
  } catch (error) {
    if (claimId) {
      await PendingUser.updateOne(
        { _id: claimedPendingUser?._id, verificationClaimId: claimId },
        { $unset: { verificationClaimId: 1, verificationClaimExpiresAt: 1 } },
      ).catch(() => {});
    }
    console.error("OTP verification failed:", {
      requestId,
      name: error.name || "Error",
      code: error.code || null,
    });
    return res.status(500).json({ message: "Could not verify the code. Please try again." });
  } finally {
    const totalMs = Date.now() - verificationStartedAt;
    if (totalMs >= 2_000) {
      console.warn("Slow OTP verification stages (ms):", {
        requestId,
        ...timings,
        totalMs,
      });
    }
  }
};

const resetPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;
    const isUserExist = await Users.findById(userId);

    res.json({
      message: "Thank",
    });

    if (!isUserExist) {
      return res.status(404).json({
        message: "User does not exist. Please sign up",
      });
    }
  } catch (err) {
    console.error(err.message);
  }

  res.json({
    msg: "Data received successfully",
  });
};

const logout = (req, res) => {
  res.clearCookie("ems", getAuthCookieOptions());
  res.send();
};

export {
  testAPI,
  getCurrentUser,
  userLogin,
  userSignUp,
  verifyOTP,
  logout,
  resetPassword,
  requestPasswordReset,
  completePasswordReset,
  getOtpDeliveryStatus,
  resendOTP,
};
