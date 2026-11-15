import fs from "fs/promises";
import path from "path";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "crypto";

import Users from "../model/user.js";
import PendingUser from "../model/pendingUser.js";

import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { setUser } from "../services/auth.js";
import { createHashPassword, compareHashPassword } from "../services/bcrypt.js";
import sendOTP, { sendPasswordResetEmail } from "../utils/otpSender.js";
import { getUploadDirectory } from "../utils/uploadPaths.js";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "../utils/eventTargeting.js";

const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000;
const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const PENDING_SIGNUP_LIFETIME_MS = 24 * 60 * 60 * 1000;
const OTP_SEND_LOCK_MS = 30 * 1000;
const OTP_VERIFY_LOCK_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_RESENDS = 5;
const MAX_OTP_EMAILS_PER_REGISTRATION = 6;
const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "If an account exists with this email address, password reset instructions will be sent.";
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

const getPendingRegistrationExpiry = (pendingUser) =>
  pendingUser.registrationExpiresAt ||
  new Date(new Date(pendingUser.createdAt || Date.now()).getTime() + PENDING_SIGNUP_LIFETIME_MS);

const hashSignupOtp = (email, otp) => {
  const key = process.env.JWT_KEY;
  if (typeof key !== "string" || key.length < 32) {
    throw new Error("JWT_KEY is not configured with sufficient entropy");
  }
  return createHmac("sha256", key)
    .update(`ems:signup-otp:v1:${email}:${otp}`)
    .digest("hex");
};

const safelyMatchesOtpHash = (storedHash, candidateHash) => {
  if (!/^[a-f\d]{64}$/i.test(storedHash || "")) return false;
  const stored = Buffer.from(storedHash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
};

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const pendingProfileImageCleanup = (pendingUser) =>
  removePendingProfileImageIfUnused(pendingUser).catch(() => {
    console.error("Could not clean up an unused pending profile image");
  });

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

const removePendingProfileImageIfUnused = async (
  pendingUser,
  { writeDefinitelyDidNotCommit = true } = {},
) => {
  const image = pendingUser?.profileImage;
  if (!image) return;

  if (pendingUser.profileImagePublicId) {
    const [userReference, pendingReference] = await Promise.all([
      Users.exists({
        $or: [
          { profileImagePublicId: pendingUser.profileImagePublicId },
          { profileImage: image },
        ],
      }),
      PendingUser.exists({
        $or: [
          { profileImagePublicId: pendingUser.profileImagePublicId },
          { profileImage: image },
        ],
      }),
    ]);
    if (!userReference && !pendingReference) {
      if (!writeDefinitelyDidNotCommit) {
        console.error("Pending signup write outcome is uncertain; retaining profile image");
        return;
      }
      await deleteFromCloudinary(pendingUser.profileImagePublicId);
    }
    return;
  }

  // Retain compatibility with local filename records; never treat URLs as paths.
  if (/^https?:\/\//i.test(image)) return;
  const filename = path.basename(image);
  if (!filename || filename !== image || filename.includes("\\")) return;

  const [userReference, pendingReference] = await Promise.all([
    Users.exists({ profileImage: image }),
    PendingUser.exists({ profileImage: image }),
  ]);
  if (userReference || pendingReference) return;
  if (!writeDefinitelyDidNotCommit) {
    console.error("Pending signup write outcome is uncertain; retaining profile image");
    return;
  }

  await fs
    .unlink(path.join(getUploadDirectory("profiles"), filename))
    .catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
};

const userSignUp = async (req, res) => {
  let uploadedImage = null;
  let pendingUserSaved = false;
  let pendingWriteAttempted = false;
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  try {
    const { name, password, contact, department, semester } = req.body || {};
    if (typeof name !== "string" || !name.trim() || typeof contact !== "string" || !contact.trim() ||
        typeof password !== "string" || !password || !email) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }
    if (!validEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (!PASSWORD_RULE.test(password)) {
      return res.status(400).json({ message: "Password must be 8-16 characters with uppercase, lowercase, number and special character." });
    }
    if (!EVENT_SEMESTERS.includes(semester) || !EVENT_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Select a valid department and semester." });
    }
    if (await Users.exists({ email })) {
      return res.status(409).json({ message: "An account already exists for this email. Please log in." });
    }

    const previous = await PendingUser.findOne({ email })
      .select("+otpHash +otpSendLockUntil profileImage profileImagePublicId otpExpires resendAvailableAt createdAt registrationExpiresAt otpResendCount otpSendCount")
      .lean();
    const now = new Date();
    const previousRegistrationExpired = previous && getPendingRegistrationExpiry(previous) <= now;
    if (previous?.otpHash && previous.otpExpires && new Date(previous.otpExpires) > now) {
      const seconds = previous.resendAvailableAt
        ? Math.max(0, Math.ceil((new Date(previous.resendAvailableAt).getTime() - now.getTime()) / 1000))
        : 0;
      return res.status(200).json({
        message: "A verification code is already active for this email.",
        resendCooldownSeconds: seconds,
      });
    }
    const priorSendCount = previousRegistrationExpired ? 0 : previous?.otpSendCount || 0;
    if (priorSendCount >= MAX_OTP_EMAILS_PER_REGISTRATION) {
      return res.status(429).json({ message: "The verification email limit was reached. Please try again later." });
    }

    if (req.file) uploadedImage = await uploadToCloudinary(req.file.path, "profiles");
    const otp = randomInt(1000, 10_000).toString();
    const otpHash = hashSignupOtp(email, otp);
    const hashedPassword = await createHashPassword(password);
    const createdAt = new Date();

    pendingWriteAttempted = true;
    const pendingUser = await PendingUser.findOneAndUpdate(
      {
        email,
        $and: [
          { $or: [
            { otpSendLockUntil: { $exists: false } },
            { otpSendLockUntil: null },
            { otpSendLockUntil: { $lte: createdAt } },
          ] },
          { $or: [
            { verificationLockUntil: { $exists: false } },
            { verificationLockUntil: null },
            { verificationLockUntil: { $lte: createdAt } },
          ] },
        ],
      },
      {
        $set: {
          name: name.trim(), email, password: hashedPassword, contact: contact.trim(),
          department, semester, profileImage: uploadedImage?.url || "",
          profileImagePublicId: uploadedImage?.publicId || "", otpHash, otpExpires: null,
          otpAttempts: 0, otpResendCount: previousRegistrationExpired ? 0 : previous?.otpResendCount || 0,
          otpSendCount: priorSendCount, resendAvailableAt: null,
          otpSendLockUntil: new Date(createdAt.getTime() + OTP_SEND_LOCK_MS),
          registrationExpiresAt: new Date(createdAt.getTime() + PENDING_SIGNUP_LIFETIME_MS),
        },
        $unset: { otp: 1, pendingOtpHash: 1, verificationLockUntil: 1 },
      },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    pendingUserSaved = Boolean(pendingUser);
    if (previous) await pendingProfileImageCleanup(previous);

    try {
      await sendOTP(email, otp);
    } catch (error) {
      await PendingUser.updateOne(
        { _id: pendingUser._id, otpHash, otpSendLockUntil: { $gt: new Date() } },
        { $set: { otpExpires: null, resendAvailableAt: null, otpSendLockUntil: null } },
      ).catch(() => {});
      console.warn("Signup verification email was not accepted:", {
        name: error?.name || "Error",
        code: typeof error?.code === "string" ? error.code.slice(0, 48) : null,
      });
      return res.status(502).json({ message: "The verification email could not be sent. Please try again." });
    }

    const acceptedAt = new Date();
    const activated = await PendingUser.updateOne(
      { _id: pendingUser._id, otpHash, otpSendLockUntil: { $gt: acceptedAt }, otpSendCount: { $lt: MAX_OTP_EMAILS_PER_REGISTRATION } },
      {
        $set: {
          otpExpires: new Date(acceptedAt.getTime() + OTP_TTL_MS),
          resendAvailableAt: new Date(acceptedAt.getTime() + OTP_RESEND_COOLDOWN_MS),
          registrationExpiresAt: new Date(acceptedAt.getTime() + PENDING_SIGNUP_LIFETIME_MS),
          otpSendLockUntil: null,
        },
        $inc: { otpSendCount: 1 },
      },
    );
    if (!activated.matchedCount) {
      console.error("OTP email accepted but signup activation did not complete");
      return res.status(503).json({ message: "The email was accepted, but signup could not be confirmed. Please retry signup." });
    }
    return res.status(200).json({
      message: "OTP sent successfully.",
      resendCooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    });
  } catch (error) {
    if (!pendingUserSaved && uploadedImage?.publicId) {
      const definitelyNotSaved = !pendingWriteAttempted || error.code === 11000 || error.name === "ValidationError";
      await removePendingProfileImageIfUnused(
        { profileImage: uploadedImage.url, profileImagePublicId: uploadedImage.publicId },
        { writeDefinitelyDidNotCommit: definitelyNotSaved },
      ).catch(() => console.error("Could not safely clean up signup profile image"));
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "A signup request for this email is already being processed. Please retry shortly." });
    }
    console.error("Signup failed:", { name: error.name || "Error", code: error.code || null });
    return res.status(500).json({ message: "Could not complete signup. Please try again." });
  } finally {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
  }
};

const resendOTP = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });

  let pendingUser;
  let otpHash;
  try {
    const now = new Date();
    pendingUser = await PendingUser.findOne({ email })
      .select("+otpHash +pendingOtpHash +otpSendLockUntil +verificationLockUntil profileImage profileImagePublicId createdAt registrationExpiresAt otpExpires resendAvailableAt otpResendCount otpSendCount")
      .lean();
    if (!pendingUser) return res.status(404).json({ message: "Signup request not found. Please sign up again." });
    if (getPendingRegistrationExpiry(pendingUser) <= now) {
      const removed = await PendingUser.deleteOne({ _id: pendingUser._id });
      if (removed.deletedCount) await pendingProfileImageCleanup(pendingUser);
      return res.status(410).json({ message: "Signup request expired. Please sign up again." });
    }
    if (pendingUser.verificationLockUntil && new Date(pendingUser.verificationLockUntil) > now) {
      return res.status(409).json({ message: "Account verification is already being processed. Please retry shortly." });
    }
    if ((pendingUser.otpResendCount || 0) >= MAX_OTP_RESENDS) {
      return res.status(429).json({ message: "The verification email resend limit was reached. Please sign up again." });
    }
    if ((pendingUser.otpSendCount || 0) >= MAX_OTP_EMAILS_PER_REGISTRATION) {
      return res.status(429).json({ message: "The verification email limit was reached. Please sign up again later." });
    }
    if (pendingUser.resendAvailableAt && new Date(pendingUser.resendAvailableAt) > now) {
      const retryAfterSeconds = Math.ceil((new Date(pendingUser.resendAvailableAt).getTime() - now.getTime()) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message: "Please wait before requesting another verification code.", retryAfterSeconds });
    }

    const otp = randomInt(1000, 10_000).toString();
    otpHash = hashSignupOtp(email, otp);
    const sendLockUntil = new Date(now.getTime() + OTP_SEND_LOCK_MS);
    const registration = [
      { registrationExpiresAt: { $gt: now } },
      { registrationExpiresAt: null },
      { registrationExpiresAt: { $exists: false } },
    ];
    const sendLock = [
      { otpSendLockUntil: null },
      { otpSendLockUntil: { $exists: false } },
      { otpSendLockUntil: { $lte: now } },
    ];
    const verificationLock = [
      { verificationLockUntil: null },
      { verificationLockUntil: { $exists: false } },
      { verificationLockUntil: { $lte: now } },
    ];
    const cooldown = [
      { resendAvailableAt: null },
      { resendAvailableAt: { $exists: false } },
      { resendAvailableAt: { $lte: now } },
    ];
    const resendLimit = [
      { otpResendCount: { $lt: MAX_OTP_RESENDS } },
      { otpResendCount: { $exists: false } },
    ];
    const emailLimit = [
      { otpSendCount: { $lt: MAX_OTP_EMAILS_PER_REGISTRATION } },
      { otpSendCount: { $exists: false } },
    ];
    const claimed = await PendingUser.findOneAndUpdate(
      { _id: pendingUser._id, $and: [
        { $or: registration }, { $or: sendLock }, { $or: verificationLock }, { $or: cooldown },
        { $or: resendLimit }, { $or: emailLimit },
      ] },
      {
        $set: {
          otpSendLockUntil: sendLockUntil,
          pendingOtpHash: otpHash,
          otpSendCount: pendingUser.otpSendCount || 0,
          otpResendCount: pendingUser.otpResendCount || 0,
        },
        $unset: { otp: 1 },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!claimed) {
      return res.status(409).json({ message: "A verification email is already being sent or the request changed. Please retry shortly." });
    }

    try {
      await sendOTP(email, otp);
    } catch (error) {
      await PendingUser.updateOne(
        { _id: claimed._id, pendingOtpHash: otpHash },
        { $unset: { pendingOtpHash: 1, otpSendLockUntil: 1 } },
      ).catch(() => {});
      console.warn("Resend verification email was not accepted:", {
        name: error?.name || "Error",
        code: typeof error?.code === "string" ? error.code.slice(0, 48) : null,
      });
      return res.status(502).json({ message: "The verification email could not be sent. Please try again." });
    }

    const acceptedAt = new Date();
    const activated = await PendingUser.updateOne(
      { _id: claimed._id, pendingOtpHash: otpHash, otpSendLockUntil: { $gt: acceptedAt }, otpSendCount: { $lt: MAX_OTP_EMAILS_PER_REGISTRATION } },
      {
        $set: {
          otpHash,
          otpExpires: new Date(acceptedAt.getTime() + OTP_TTL_MS),
          resendAvailableAt: new Date(acceptedAt.getTime() + OTP_RESEND_COOLDOWN_MS),
          otpAttempts: 0,
          registrationExpiresAt: new Date(acceptedAt.getTime() + PENDING_SIGNUP_LIFETIME_MS),
          otpSendLockUntil: null,
        },
        $inc: { otpSendCount: 1, otpResendCount: 1 },
        $unset: { pendingOtpHash: 1 },
      },
    );
    if (!activated.matchedCount) {
      return res.status(503).json({ message: "The email was accepted, but the code could not be activated. Please retry." });
    }
    return res.status(200).json({
      message: "A new verification code was sent.",
      resendCooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    });
  } catch (error) {
    if (pendingUser?._id && otpHash) {
      await PendingUser.updateOne(
        { _id: pendingUser._id, pendingOtpHash: otpHash },
        { $unset: { pendingOtpHash: 1, otpSendLockUntil: 1 } },
      ).catch(() => {});
    }
    console.error("OTP resend failed:", { name: error.name || "Error", code: error.code || null });
    return res.status(500).json({ message: "Could not send a new verification email." });
  }
};

const verifyOTP = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const otp = req.body?.otp;
  if (!validEmail(email) || typeof otp !== "string" || !/^\d{4}$/.test(otp)) {
    return res.status(400).json({ message: "Enter a valid email address and 4-digit verification code." });
  }

  try {
    const pendingUser = await PendingUser.findOne({ email })
      .select("+otpHash +otpSendLockUntil +verificationLockUntil +otp profileImage profileImagePublicId createdAt registrationExpiresAt otpExpires otpAttempts")
      .lean();
    if (!pendingUser) return res.status(404).json({ message: "Signup request not found. Please sign up again." });

    const now = new Date();
    if (getPendingRegistrationExpiry(pendingUser) <= now) {
      const removed = await PendingUser.deleteOne({ _id: pendingUser._id });
      if (removed.deletedCount) await pendingProfileImageCleanup(pendingUser);
      return res.status(410).json({ message: "Signup request expired. Please sign up again." });
    }
    if (pendingUser.otpSendLockUntil && new Date(pendingUser.otpSendLockUntil) > now) {
      return res.status(409).json({ message: "A verification email is still being sent. Please retry shortly." });
    }
    if (!pendingUser.otpHash && pendingUser.otp) {
      await PendingUser.updateOne(
        { _id: pendingUser._id, otp: pendingUser.otp },
        { $unset: { otp: 1 }, $set: { otpExpires: new Date(0) } },
      );
    }
    if (!pendingUser.otpHash || !pendingUser.otpExpires || new Date(pendingUser.otpExpires) <= now) {
      return res.status(400).json({ message: "The verification code expired or is unavailable. Request another code." });
    }
    if ((pendingUser.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect codes. Request another code." });
    }

    const candidateHash = hashSignupOtp(email, otp);
    if (!safelyMatchesOtpHash(pendingUser.otpHash, candidateHash)) {
      const attempt = await PendingUser.findOneAndUpdate(
        {
          _id: pendingUser._id,
          otpHash: pendingUser.otpHash,
          otpExpires: { $gt: now },
          $and: [
            { $or: [
              { otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
              { otpAttempts: null },
              { otpAttempts: { $exists: false } },
            ] },
            { $or: [
              { otpSendLockUntil: null },
              { otpSendLockUntil: { $exists: false } },
              { otpSendLockUntil: { $lte: now } },
            ] },
            { $or: [
              { verificationLockUntil: null },
              { verificationLockUntil: { $exists: false } },
              { verificationLockUntil: { $lte: now } },
            ] },
          ],
        },
        { $inc: { otpAttempts: 1 } },
        { returnDocument: "after" },
      ).select("otpAttempts +otpHash").lean();
      if (!attempt) return res.status(409).json({ message: "The verification code changed or expired. Try again." });
      if (attempt.otpAttempts >= MAX_OTP_ATTEMPTS) {
        await PendingUser.updateOne(
          { _id: pendingUser._id, otpHash: attempt.otpHash, otpAttempts: { $gte: MAX_OTP_ATTEMPTS } },
          { $set: { otpHash: null, otpExpires: new Date(0) }, $unset: { otp: 1 } },
        );
        return res.status(429).json({ message: "Too many incorrect codes. Request another code." });
      }
      return res.status(400).json({ message: "Invalid verification code." });
    }

    const verificationLockUntil = new Date(now.getTime() + OTP_VERIFY_LOCK_MS);
    const claimed = await PendingUser.findOneAndUpdate(
      {
        _id: pendingUser._id,
        otpHash: pendingUser.otpHash,
        otpExpires: { $gt: now },
        $and: [
          { $or: [
            { otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
            { otpAttempts: null },
            { otpAttempts: { $exists: false } },
          ] },
          { $or: [
            { otpSendLockUntil: null },
            { otpSendLockUntil: { $exists: false } },
            { otpSendLockUntil: { $lte: now } },
          ] },
          { $or: [
            { verificationLockUntil: null },
            { verificationLockUntil: { $exists: false } },
            { verificationLockUntil: { $lte: now } },
          ] },
        ],
      },
      { $set: { verificationLockUntil } },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!claimed) {
      return res.status(409).json({ message: "Verification is already being processed. Please retry shortly." });
    }

    const newUser = {
      name: claimed.name,
      email: claimed.email,
      password: claimed.password,
      contact: claimed.contact,
      department: claimed.department,
      semester: claimed.semester,
      profileImage: claimed.profileImage,
      profileImagePublicId: claimed.profileImagePublicId || "",
    };
    try {
      await Users.create(newUser);
    } catch (error) {
      await PendingUser.updateOne(
        { _id: claimed._id, verificationLockUntil },
        { $set: { verificationLockUntil: null } },
      ).catch(() => {});
      if (error.code === 11000) {
        return res.status(409).json({ message: "An account already exists for this email." });
      }
      throw error;
    }

    try {
      await PendingUser.deleteOne({ _id: claimed._id, verificationLockUntil });
    } catch (error) {
      console.error("Verified account created but pending signup cleanup failed:", {
        name: error.name || "Error", code: error.code || null,
      });
    }
    void pendingProfileImageCleanup(claimed);
    return res.status(200).json({ message: "Account successfully created. Please log in." });
  } catch (error) {
    console.error("OTP verification failed:", { name: error.name || "Error", code: error.code || null });
    return res.status(500).json({ message: "Could not verify the code. Please try again." });
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
  resendOTP,
  verifyOTP,
  logout,
  resetPassword,
  requestPasswordReset,
  completePasswordReset,
};
