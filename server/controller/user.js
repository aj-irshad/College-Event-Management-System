import Users from "../model/user.js";
import { createHashPassword, compareHashPassword } from "../services/bcrypt.js";
import path from "path";

const setUserProfile = async (req, res) => {
  const user = await Users.findById(req.userId).select("-password");

  if (!user) {
    return res.status(404).json({
      msg: "User not found! Please sign up",
    });
  }

  const token = req.cookies.token;

  res.json({
    loggedIn: true,
    user,
  });
};

const getStudentCountAdmin = async (_req, res) => {
  try {
    const totalStudents = await Users.countDocuments({ role: "user" });
    return res.status(200).json({ totalStudents });
  } catch (error) {
    console.error("Could not load student count:", error.message);
    return res.status(500).json({ message: "Could not load student count" });
  }
};

const ADMIN_PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`]{8,16}$/;
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createAdmin = async (req, res) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const password = req.body?.password;

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Enter a password." });
  }

  const respondForExistingAccount = async (existing) => {
    if (existing.role === "admin") {
      return res.status(200).json({
        action: "already-admin",
        message: "This account is already an administrator.",
      });
    }

    const promoted = await Users.findOneAndUpdate(
      { _id: existing._id, role: "user" },
      { $set: { role: "admin" } },
      { returnDocument: "after", runValidators: true },
    ).select("_id email role").lean();

    if (promoted) {
      return res.status(200).json({
        action: "promoted",
        message: "Existing account promoted to administrator. Its password and profile were unchanged.",
      });
    }

    const current = await Users.findById(existing._id).select("role").lean();
    if (current?.role === "admin") {
      return res.status(200).json({
        action: "already-admin",
        message: "This account is already an administrator.",
      });
    }
    return res.status(409).json({ message: "The account changed while it was being processed. Please retry." });
  };

  try {
    const existing = await Users.findOne({ email }).select("_id role").lean();
    if (existing) return await respondForExistingAccount(existing);

    if (!ADMIN_PASSWORD_RULE.test(password)) {
      return res.status(400).json({
        message: "Password must be 8–16 characters with uppercase, lowercase, number and special character.",
      });
    }

    const hashedPassword = await createHashPassword(password);
    try {
      await Users.create({ email, password: hashedPassword, role: "admin" });
      return res.status(201).json({
        action: "created",
        message: "Administrator account created successfully.",
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;

      // The unique email index is authoritative if a signup/admin request raced this insert.
      const racedAccount = await Users.findOne({ email }).select("_id role").lean();
      if (racedAccount) return await respondForExistingAccount(racedAccount);
      throw error;
    }
  } catch (error) {
    console.error("Could not create or promote administrator:", {
      name: error?.name || "Error",
      code: error?.code || null,
    });
    return res.status(500).json({ message: "Could not process the administrator account. Please try again." });
  }
};

/* const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Users.findOne({ email });

    if (!user) {
      return res.status(404).json({
        msg: "user not found",
      });
    }

    const matchPassword = await bcrypt.compareHashPassword(
      password,
      user.password,
    );

    if (!matchPassword) {
      return res.status(401).json({
        msg: "Credentials not valid",
      });
    }

    await model.userModel.findOneAndDelete({ email });

    return res.status(200).json({
      msg: "Successfully deleted user",
    });
  } catch (error) {
    res.status(501).json({
      msg: "Server error",
    });
  }
};
 */
export { setUserProfile, getStudentCountAdmin, createAdmin };
