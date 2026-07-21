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

// const searchUser = async (req, res) => {
//   const searchedName = req.query.search;
//   const requester = req.user.id;

//   if (!searchedName) return res.json([]);

//   const users = await model.userModel
//     .find({
//       name: { $regex: searchedName, $options: "i" },
//       _id: { $ne: requester },
//     })
//     .select("name")
//     .limit(10);

//   return res.status(200).json(users);
// };

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
export { setUserProfile };
