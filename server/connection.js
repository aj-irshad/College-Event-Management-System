import mongoose from "mongoose";

async function userConnection(dbName) {
  const url = `mongodb://localhost:27017/${dbName}`;

  try {
    await mongoose.connect(url);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
}

export default userConnection;
