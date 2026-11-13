import fs from "fs/promises";
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "crypto";

import Users from "../model/user.js";
import PendingUser from "../model/pendingUser.js";

import {
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import { setUser } from "../services/auth.js";
import { createHashPassword, compareHashPassword } from "../services/bcrypt.js";
import sendOTP, { sendPasswordResetEmail } from "../utils/otpSender.js";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "../utils/eventTargeting.js";
import {
  hashOtp,
  otpHashingConfigured,
  verifyOtpHash,
} from "../utils/otpCrypto.js";
import { removePendingProfileImageIfUnused } from "../utils/pendingProfileImageCleanup.js";
import { consumeSignupAttempt } from "../utils/signupRateLimit.js";

const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000;
const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "If an account exists with this email address, password reset instructions will be sent.";
const PENDING_SIGNUP_LIFETIME_MS = 24 * 60 * 60_000;
const OTP_RESEND_COOLDOWN_MS = 60_000;
const OTP_LIFETIME_MS = 2 * 60_000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_RESENDS = 5;
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

const pendingExpiry = (pendingUser) =>
  pendingUser.registrationExpiresAt ||
  new Date(new Date(pendingUser.createdAt || Date.now()).getTime() + PENDING_SIGNUP_LIFETIME_MS);

const activeOtpSends = new Set();

const makeOtpCredentials = () => {
  const otp = randomInt(1000, 10_000).toString();
  const otpSalt = randomBytes(16).toString("hex");
  return { otp, otpSalt, otpHash: hashOtp(otp, otpSalt) };
};

const removeExpiredPendingSignup = async (pendingUser) => {
  const removed = await PendingUser.deleteOne({ _id: pendingUser._id });
  if (removed.deletedCount) {
    void removePendingProfileImageIfUnused(pendingUser).catch(() => {
      console.error("Expired pending profile image cleanup failed");
    });
  }
};

const sendOtpForPendingUser = async (pendingUser, { countAsResend = false } = {}) => {
  const pendingId = String(pendingUser._id);
  if (activeOtpSends.has(pendingId)) return { type: "busy", retryAfterSeconds: 2 };

  const now = new Date();
  if (pendingExpiry(pendingUser) <= now) return { type: "expired" };
  if (countAsResend && (pendingUser.otpResendCount || 0) >= MAX_OTP_RESENDS) {
    return { type: "limit" };
  }
  if (pendingUser.resendAvailableAt && pendingUser.resendAvailableAt > now) {
    return {
      type: "cooldown",
      retryAfterSeconds: Math.max(1, Math.ceil((pendingUser.resendAvailableAt - now) / 1000)),
    };
  }

  activeOtpSends.add(pendingId);
  const credentials = makeOtpCredentials();
  const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);

  try {
    const update = {
      $set: {
        otpHash: credentials.otpHash,
        otpSalt: credentials.otpSalt,
        otpExpires: null,
        otpAttempts: 0,
        resendAvailableAt,
        registrationExpiresAt: new Date(Math.max(
          pendingExpiry(pendingUser).getTime(),
          now.getTime() + OTP_LIFETIME_MS,
        )),
      },
      $unset: { otp: 1 },
    };
    if (countAsResend) update.$inc = { otpResendCount: 1 };

    const saved = await PendingUser.findOneAndUpdate(
      {
        _id: pendingUser._id,
        $or: [
          { registrationExpiresAt: { $gt: now } },
          {
            registrationExpiresAt: { $exists: false },
            createdAt: { $gt: new Date(now.getTime() - PENDING_SIGNUP_LIFETIME_MS) },
          },
        ],
      },
      update,
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!saved) return { type: "expired" };

    try {
      await sendOTP(saved.email, credentials.otp);
    } catch (error) {
      await PendingUser.updateOne(
        { _id: saved._id, otpHash: credentials.otpHash },
        { $unset: { otpHash: 1, otpSalt: 1 }, $set: { otpExpires: null } },
      ).catch((updateError) => {
        console.error("Could not clear an unsent OTP:", {
          name: updateError.name || "Error",
          code: updateError.code || null,
        });
      });
      const safeCode = /^[A-Za-z0-9_-]{1,48}$/.test(error?.code || "")
        ? error.code
        : "EMAIL_DELIVERY_ERROR";
      console.warn("Synchronous OTP email delivery failed:", {
        code: safeCode,
        responseCode: Number(error?.responseCode) || null,
      });
      return { type: "failed" };
    }

    const sentAt = new Date();
    const otpExpires = new Date(sentAt.getTime() + OTP_LIFETIME_MS);
    const persisted = await PendingUser.updateOne(
      { _id: saved._id, otpHash: credentials.otpHash },
      {
        $set: {
          otpExpires,
          registrationExpiresAt: new Date(Math.max(pendingExpiry(saved).getTime(), otpExpires.getTime())),
        },
      },
    );
    if (!persisted.matchedCount) {
      throw new Error("OTP was accepted but its pending signup could not be updated");
    }
    return { type: "sent" };
  } finally {
    activeOtpSends.delete(pendingId);
  }
};

const respondToOtpSend = (res, email, result) => {
  if (result.type === "sent") {
    return res.status(200).json({ message: "Verification code sent.", email });
  }
  if (result.type === "failed") {
    return res.status(502).json({
      message: "Your registration is saved, but the verification email could not be sent. Please retry.",
      email,
      pendingSignup: true,
    });
  }
  if (result.type === "limit") {
    return res.status(429).json({
      message: "The resend limit was reached. Please try again after this registration expires.",
      email,
      pendingSignup: true,
    });
  }
  if (result.type === "cooldown" || result.type === "busy") {
    return res.status(429).json({
      message: result.type === "busy"
        ? "A verification email is already being sent. Please retry shortly."
        : "Please wait before requesting another verification code.",
      email,
      pendingSignup: true,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return res.status(410).json({ message: "Signup request expired. Please sign up again." });
};

const userSignUp = async (req, res) => {
  const signupStartedAt = Date.now();
  const requestId = req.requestId || randomUUID();
  const timings = {};
  let uploadedImage = null;
  let pendingUserSaved = false;
  let pendingUserWriteAttempted = false;
  let email = "";

  try {
    const validationStartedAt = Date.now();
    const { name, password, contact, department, semester } = req.body || {};
    email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (
      typeof name !== "string" || !name.trim() ||
      typeof password !== "string" || !password ||
      typeof contact !== "string" || !contact.trim() ||
      !email
    ) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (!PASSWORD_RULE.test(password)) {
      return res.status(400).json({
        message: "Password must be 8–16 characters with uppercase, lowercase, number and special character.",
      });
    }
    if (!EVENT_SEMESTERS.includes(semester) || !EVENT_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Select a valid department and semester." });
    }
    timings.validationMs = Date.now() - validationStartedAt;

    const signupRetryAfter = consumeSignupAttempt(email);
    if (signupRetryAfter) {
      return res.status(429).json({
        message: "Too many signup attempts for this address. Please try again later.",
        retryAfterSeconds: signupRetryAfter,
      });
    }
    if (!otpHashingConfigured()) {
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
    let pendingUser = await PendingUser.findOne({ email }).lean();
    timings.pendingUserLookupMs = Date.now() - stageStartedAt;
    const now = new Date();

    if (
      pendingUser &&
      pendingExpiry(pendingUser) <= now &&
      (!pendingUser.otpExpires || new Date(pendingUser.otpExpires) <= now) &&
      !activeOtpSends.has(String(pendingUser._id))
    ) {
      await removeExpiredPendingSignup(pendingUser);
      pendingUser = null;
    }

    if (pendingUser) {
      if (activeOtpSends.has(String(pendingUser._id))) {
        return res.status(409).json({
          message: "A verification email is already being sent. Please retry shortly.",
          email,
          pendingSignup: true,
          retryAfterSeconds: 2,
        });
      }
      if (pendingUser.otpExpires && new Date(pendingUser.otpExpires) > now) {
        return res.status(200).json({ message: "A valid verification code is already active.", email });
      }
      return respondToOtpSend(
        res,
        email,
        await sendOtpForPendingUser(pendingUser, { countAsResend: true }),
      );
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
        uploadedImage = await uploadToCloudinary(req.file.path, "profiles", { timeout: 30_000 });
      } finally {
        timings.cloudinaryUploadMs = Date.now() - stageStartedAt;
      }
    }

    stageStartedAt = Date.now();
    const hashedPassword = await createHashPassword(password);
    timings.passwordHashMs = Date.now() - stageStartedAt;
    const createdAt = new Date();

    pendingUserWriteAttempted = true;
    pendingUser = await PendingUser.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      contact: contact.trim(),
      department,
      semester,
      profileImage: uploadedImage?.url || "",
      profileImagePublicId: uploadedImage?.publicId || "",
      otpAttempts: 0,
      otpResendCount: 0,
      otpExpires: null,
      registrationExpiresAt: new Date(createdAt.getTime() + PENDING_SIGNUP_LIFETIME_MS),
      resendAvailableAt: createdAt,
    });
    pendingUserSaved = true;
    timings.pendingRegistrationPersistenceMs = Date.now() - stageStartedAt;

    stageStartedAt = Date.now();
    const sendResult = await sendOtpForPendingUser(pendingUser);
    timings.smtpDeliveryMs = Date.now() - stageStartedAt;
    return respondToOtpSend(res, email, sendResult);
  } catch (error) {
    if (!pendingUserSaved && uploadedImage?.url) {
      const writeDefinitelyDidNotCommit =
        !pendingUserWriteAttempted || error.code === 11000 || error.name === "ValidationError";
      await removePendingProfileImageIfUnused(
        { profileImage: uploadedImage.url, profileImagePublicId: uploadedImage.publicId },
        { writeDefinitelyDidNotCommit },
      ).catch(() => console.error("Could not safely clean up the signup profile image"));
    }

    console.error("Signup request failed:", {
      requestId,
      name: error.name || "Error",
      code: error.code || null,
    });
    if (error.code === 11000 && email) {
      const duplicatePending = await PendingUser.findOne({ email }).lean().catch(() => null);
      if (duplicatePending) {
        if (duplicatePending.otpExpires && new Date(duplicatePending.otpExpires) > new Date()) {
          return res.status(200).json({ message: "A valid verification code is already active.", email });
        }
        return res.status(409).json({
          message: "A signup is already pending for this email. Request another verification code to continue.",
          email,
          pendingSignup: true,
        });
      }
    }
    return res.status(500).json({
      message: "Signup could not be confirmed. Please retry using the same email address.",
      ...(email ? { email, pendingSignup: pendingUserSaved || pendingUserWriteAttempted } : {}),
    });
  } finally {
    if (req.file?.path && !uploadedImage?.isLocal) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    timings.controllerTotalMs = Date.now() - signupStartedAt;
    if (timings.controllerTotalMs >= 5_000) {
      console.warn("Slow signup controller stages (ms):", { requestId, ...timings });
    }
  }
};

const resendOTP = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  const retryAfter = consumeSignupAttempt(email);
  if (retryAfter) {
    return res.status(429).json({
      message: "Too many verification requests for this address. Please try again later.",
      retryAfterSeconds: retryAfter,
    });
  }
  if (!otpHashingConfigured()) {
    return res.status(503).json({ message: "Email verification is temporarily unavailable." });
  }

  try {
    const pendingUser = await PendingUser.findOne({ email }).lean();
    if (!pendingUser) return res.status(404).json({ message: "Signup request not found." });
    if (pendingUser.otpExpires && new Date(pendingUser.otpExpires) > new Date()) {
      return res.status(200).json({ message: "A valid verification code is already active.", email });
    }
    if (pendingExpiry(pendingUser) <= new Date()) {
      await removeExpiredPendingSignup(pendingUser);
      return res.status(410).json({ message: "Signup request expired. Please sign up again." });
    }
    return respondToOtpSend(
      res,
      email,
      await sendOtpForPendingUser(pendingUser, { countAsResend: true }),
    );
  } catch (error) {
    console.error("OTP resend request failed:", { code: error.code || null });
    return res.status(500).json({ message: "Could not send a new verification email." });
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
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof otp !== "string" || !/^\d{4}$/.test(otp)) {
      return res.status(400).json({ message: "Enter a valid email address and 4-digit verification code." });
    }
    if (!otpHashingConfigured()) {
      return res.status(503).json({ message: "Email verification is temporarily unavailable." });
    }

    let stageStartedAt = Date.now();
    const pendingUser = await PendingUser.findOne({ email }).lean();
    timings.pendingLookupMs = Date.now() - stageStartedAt;
    if (!pendingUser) return res.status(404).json({ message: "Signup request not found." });

    const now = new Date();
    if (pendingExpiry(pendingUser) <= now && (!pendingUser.otpExpires || new Date(pendingUser.otpExpires) <= now)) {
      return res.status(410).json({ message: "Signup request expired. Please sign up again." });
    }
    if ((pendingUser.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect codes. Request a new code to continue." });
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
    const activeRegistration = {
      $or: [
        { registrationExpiresAt: { $gt: now } },
        { otpExpires: { $gt: now } },
        {
          registrationExpiresAt: { $exists: false },
          createdAt: { $gt: new Date(now.getTime() - PENDING_SIGNUP_LIFETIME_MS) },
        },
      ],
    };
    if (!codeMatches) {
      const attempt = await PendingUser.findOneAndUpdate(
        {
          _id: pendingUser._id,
          ...otpIdentity,
          otpExpires: { $gt: now },
          ...activeRegistration,
          $and: [
            { $or: [{ otpAttempts: { $lt: MAX_OTP_ATTEMPTS } }, { otpAttempts: { $exists: false } }] },
            { $or: [{ verificationClaimExpiresAt: { $exists: false } }, { verificationClaimExpiresAt: { $lte: now } }] },
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
        ...activeRegistration,
        $and: [
          { $or: [{ otpAttempts: { $lt: MAX_OTP_ATTEMPTS } }, { otpAttempts: { $exists: false } }] },
          { $or: [{ verificationClaimExpiresAt: { $exists: false } }, { verificationClaimExpiresAt: { $lte: now } }] },
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
  resendOTP,
};
