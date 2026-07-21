import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

function setUser(user) {
  const payload = {
    userId: user._id,
  };
  return jwt.sign(payload, process.env.JWT_KEY);
}

export { setUser };
