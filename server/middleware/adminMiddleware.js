import Users from "../model/user.js";

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await Users.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        msg: "Access denied. Admin only.",
      });
    }

    next();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      msg: "Server error",
    });
  }
};

export default adminMiddleware;
