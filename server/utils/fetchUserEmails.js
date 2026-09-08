import Users from "../model/user.js";

const fetchAllEmails = async () => {
  const users = await Users.find().select("email -_id");

  return users.map((user) => user.email);
};

export default fetchAllEmails;
