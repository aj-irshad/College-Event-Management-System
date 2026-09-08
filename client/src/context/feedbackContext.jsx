import { createContext, useEffect, useState } from "react";

import { fetchFeedback } from "../services/feedbackService";

const feedbackContext = createContext({});

export const FeedbackProvider = ({ children }) => {
  const [totalFeedback, setTotalFeedback] = useState(0);

  useEffect(() => {
    const getAllFeedbacks = async () => {
      try {
        const response = await fetchFeedback();

        setTotalFeedback(response.data.feedback.length);
      } catch (err) {
        console.error(err.message);
      }
    };
    getAllFeedbacks();
  }, []);

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
