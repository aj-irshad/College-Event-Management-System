import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { fetchAdminFeedbackForms, fetchFeedbackForm } from "../services/feedbackService";
import authContext from "./authContext";
import socket from "../api/socket";

const feedbackContext = createContext({});

export const FeedbackProvider = ({ children }) => {
  const [totalFeedback, setTotalFeedback] = useState(0);
  const { isAdmin } = useContext(authContext);

  const loadFeedbackCount = useCallback(async () => {
    try {
      const response = isAdmin ? await fetchAdminFeedbackForms() : await fetchFeedbackForm();
      setTotalFeedback(response.data.feedback?.length || 0);
    } catch (err) {
      console.error(err.message);
    }
  }, [isAdmin]);

  useEffect(() => {
    const refresh = () => void loadFeedbackCount();
    refresh();
    socket.on(isAdmin ? "feedback:admin-changed" : "feedback:created", refresh);
    if (!isAdmin) {
      socket.on("feedback:updated", refresh);
      socket.on("feedback:deleted", refresh);
    }
    socket.on("events:updated", refresh);
    socket.on("events:statuses-updated", refresh);
    socket.on("connect", refresh);
    return () => {
      socket.off(isAdmin ? "feedback:admin-changed" : "feedback:created", refresh);
      if (!isAdmin) {
        socket.off("feedback:updated", refresh);
        socket.off("feedback:deleted", refresh);
      }
      socket.off("events:updated", refresh);
      socket.off("events:statuses-updated", refresh);
      socket.off("connect", refresh);
    };
  }, [isAdmin, loadFeedbackCount]);

  return (
    <feedbackContext.Provider
      value={{
        totalFeedback,
      }}
    >
      {children}
    </feedbackContext.Provider>
  );
};

export default feedbackContext;
