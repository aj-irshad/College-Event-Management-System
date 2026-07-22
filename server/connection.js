import mongoose from "mongoose";
import "dotenv/config";

async function userConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
}

export default userConnection;
