import { useEffect, useState } from "react";
import { fetchFeedback } from "../../../services/feedbackService";
import FeedbackCard from "./FeedbackCard";
import "../styles/feedback.css";
const UserFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    const getFeedbacks = async () => {
      try {
        const response = await fetchFeedback();

        console.log("Feedback data:", response.data.feedback);

        setFeedbacks(response.data.feedback);
      } catch (error) {
        console.error(error);
      }
    };

    getFeedbacks();
  }, []);

  // Remove submitted feedback from the page
  const removeFeedback = (feedbackId) => {
    setFeedbacks((prevFeedbacks) =>
      prevFeedbacks.filter((feedback) => feedback._id !== feedbackId),
    );
  };

  return (
    <section className="feedbackPage">
      <h1>Feedback</h1>

      {/* <div className="feedbackContainer">
        {feedbacks.map((feedback) => (
          <FeedbackCard
            key={feedback._id}
            feedback={feedback}
            removeFeedback={removeFeedback}
          />
        ))}
      </div> */}

      {feedbacks.length > 0 ? (
        <div className="feedbackContainer">
          {feedbacks.map((feedback) => (
            <FeedbackCard
              key={feedback._id}
              feedback={feedback}
              removeFeedback={removeFeedback}
            />
          ))}
        </div>
      ) : (
        <section className="empty-admin-feedback">
          <div className="empty-admin-feedback-icon">✦</div>

          <h2>No feedback yet</h2>
        </section>
      )}
    </section>
  );
};

export default UserFeedback;
