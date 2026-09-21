import { useContext } from "react";
import authContent from "../../../context/authContext";
import UserPoll from "./UserPoll";
import AdminPoll from "./AdminPoll";
// import AdminPollResults from "./AdminPollResult";

const Polls = () => {
  const { isAdmin } = useContext(authContent);
  return isAdmin ? <AdminPoll /> : <UserPoll />;
};

export default Polls;
