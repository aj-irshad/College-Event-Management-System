import bcrypt from "bcrypt";
import "dotenv/config";

import userConnection from "../connection.js";
import Users from "../model/user.js";

const ADMIN = {
  name: "Admin",
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
};

const makeAdmin = async () => {
  try {
    if (!ADMIN.email || !ADMIN.password) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the .env file.",
      );
    }

    await userConnection();

    let user = await Users.findOne({ email: ADMIN.email });

    if (user) {
      const hashedPassword = await bcrypt.hash(ADMIN.password, 10);

      user.name = ADMIN.name;
      user.role = "admin";
      user.password = hashedPassword;

      await user.save();

      console.log(`${user.email} has been promoted to admin.`);
    } else {
      const hashedPassword = await bcrypt.hash(ADMIN.password, 10);

      user = await Users.create({
        name: ADMIN.name,
        email: ADMIN.email,
        password: hashedPassword,
        role: "admin",
        profileImage: "../uploads/admin.jpeg",
      });

      console.log(`New admin account created: ${user.email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

makeAdmin();
