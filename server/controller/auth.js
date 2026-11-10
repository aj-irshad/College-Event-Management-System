import fs from "fs/promises";
import path from "path";
import { createHash, randomBytes } from "crypto";

import Users from "../model/user.js";
import PendingUser from "../model/pendingUser.js";

import { setUser } from "../services/auth.js";
import { createHashPassword, compareHashPassword } from "../services/bcrypt.js";
import sendOTP, { sendPasswordResetEmail } from "../utils/otpSender.js";
import { getUploadDirectory } from "../utils/uploadPaths.js";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "../utils/eventTargeting.js";

const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000;
const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "If an account exists with this email address, password reset instructions will be sent.";
const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`]{8,16}$/;

const requestPasswordReset = async (req, res) => {
  const email = typeof req.body?.email === "string"
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
    return res.status(400).json({ message: "This password reset link is invalid or expired." });
  }
  if (typeof newPassword !== "string" || !PASSWORD_RULE.test(newPassword)) {
    return res.status(400).json({
      message: "Password must be 8–16 characters with uppercase, lowercase, number and special character.",
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
      return res.status(400).json({ message: "This password reset link is invalid or expired." });
    }

    return res.status(200).json({ message: "Password reset successful. Please log in." });
  } catch {
    console.error("Password reset could not be completed");
    return res.status(500).json({ message: "Could not reset your password. Please try again." });
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
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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

const userSignUp = async (req, res) => {
  try {
    const { name, email, password, contact, department, semester } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All required fields must be provided.",
      });
    }

    if (!EVENT_SEMESTERS.includes(semester)) {
      return res.status(400).json({ message: "Select a valid semester." });
    }
    if (!EVENT_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Select a valid department." });
    }

    // Check if user already exists
    const existingUser = await Users.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists. Please login.",
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // OTP expires in 2 minutes
    const otpExpires = Date.now() + 2 * 60 * 1000;

    // Remove previous pending signup (if any)
    await PendingUser.deleteOne({ email });

    // Store pending user
    await PendingUser.create({
      name,
      email,
      password: await createHashPassword(password),
      contact,
      department,
      semester,
      profileImage: req.file ? req.file.filename : null,
      otp,
      otpExpires,
    });

    // Send OTP
    await sendOTP(email, otp);

    return res.status(200).json({
      message: "OTP sent successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(404).json({
        message: "Signup request not found",
      });
    }

    if (pendingUser.otpExpires < Date.now()) {
      if (pendingUser.profileImage) {
        const filename = path.basename(pendingUser.profileImage);
        if (filename === pendingUser.profileImage) {
          await fs.unlink(path.join(getUploadDirectory("profiles"), filename)).catch(() => {});
        }
      }
      await PendingUser.deleteOne({ email });
      return res.status(400).json({
        message: "OTP Expired",
      });
    }

    if (pendingUser.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const newUser = {
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      contact: pendingUser.contact,
      department: pendingUser.department,
      semester: pendingUser.semester,
      profileImage: pendingUser.profileImage,
    };

    await Users.create(newUser);

    await PendingUser.deleteOne({ email });

    return res.status(200).json({
      message: "Account successfully created",
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error!",
    });
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
  res.clearCookie("ems");
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
};
