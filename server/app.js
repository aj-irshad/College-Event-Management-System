import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

import connection from "./connection.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL;
const VITE_URL = process.env.VITE_BASE_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: VITE_URL, credentials: true }));

// DB connection
connection("eventManagementSystem");

app.use(express.static(path.join(__dirname, "../client/dist")));

app.use("/auth", authRouter);
app.use("/user", userRouter);

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is listening at ${PORT}`);
});
