import UserFeedback from "../components/UserAdmin";
import AdminFeedback from "../components/AdminFeedback";
import { useContext } from "react";
import authContext from "../../../context/authContext";

const FeedbackPage = () => {
  const { isAdmin } = useContext(authContext);
  return isAdmin ? <AdminFeedback /> : <UserFeedback />;
};

export default FeedbackPage;
