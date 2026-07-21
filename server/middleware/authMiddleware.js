import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.ems;

    if (!token) {
      return res.status(401).json({
        msg: "Please login",
      });
    }

    const decode = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decode.userId;
    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid token" });
  }
}

export default authMiddleware;
