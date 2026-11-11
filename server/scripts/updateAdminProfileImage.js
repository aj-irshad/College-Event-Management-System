import mongoose from "mongoose";
import "dotenv/config";

import Users from "../model/user.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const imageUrl = process.env.ADMIN_IMG?.trim();

const updateAdminProfileImage = async () => {
  try {
    if (!email || !imageUrl) {
      throw new Error("ADMIN_EMAIL and ADMIN_IMG must be configured");
    }

    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com") {
      throw new Error("ADMIN_IMG must be an HTTPS Cloudinary URL");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI must be configured");
    }

    await mongoose.connect(process.env.MONGO_URI);
    const result = await Users.updateOne(
      { email, role: "admin" },
      { $set: { profileImage: imageUrl } },
      { runValidators: true },
    );

    if (result.matchedCount !== 1) {
      throw new Error("No admin account matched ADMIN_EMAIL");
    }

    console.info(result.modifiedCount === 1
      ? "Admin profile image updated"
      : "Admin profile image was already current");
  } catch (error) {
    console.error("Admin profile image update failed:", error.name || "Error");
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

void updateAdminProfileImage();
