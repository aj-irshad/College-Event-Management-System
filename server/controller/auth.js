import Users from "../model/user.js";
import PendingUser from "../model/pendingUser.js";

import { setUser } from "../services/auth.js";
import { createHashPassword, compareHashPassword } from "../services/bcrypt.js";
import sendOTP from "../otpSender.js";

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
    res.status(500).json({ msg: "Server error" });
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
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "Internal server error",
    });
  }
};

const userSignUp = async (req, res) => {
  let otpSent = false;
  let otpVerified = false;
  try {
    const { name, email, password, image } = req.body;

    const existingUser = await Users.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        msg: "User already exist. Please login",
      });
    }

    const otp = Math.floor(Math.random() * 9000 + 1000).toString();
    const twoMinuteFromNow = Date.now() + 2 * 60 * 1000;

    const pendingUser = {
      name: name,
      email: email,
      password: await createHashPassword(password),
      profileImage: image,
      otp: otp,
      otpExpires: twoMinuteFromNow,
    };

    await PendingUser.deleteOne({ email });

    await PendingUser.create(pendingUser);

    await sendOTP(email, otp);
    res.json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error(error);
    console.error(error.message);
    console.error(error.stack);
    res.status(500).json({
      msg: "Internal server error",
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
      profileImage: pendingUser.image,
    };

    await Users.create(newUser);

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
    console.log(userId, isUserExist);
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
  console.log("Cookie clear successfull");
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
};
