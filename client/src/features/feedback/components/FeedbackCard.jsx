import { useState } from "react";
import { submitFeedback } from "../../../services/feedbackService";

const FeedbackCard = ({ feedback, removeFeedback }) => {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");

  const handleSubmit = async () => {
    try {
      const feedbackData = {
        feedbackForm: feedback._id,
        event: feedback.event._id,
        ratings: Number(rating),
        comment,
      };

      await submitFeedback(feedbackData);

      alert("Feedback submitted successfully");

      // Remove card from FeedbackPage
      removeFeedback(feedback._id);
    } catch (error) {
      console.error(error);
      alert("Failed to submit feedback");
    }
  };

  return (
    <article className="feedbackCard">
      <header className="feedbackCardHeader">
        <span>{feedback.event?.event_type}</span>
        <h2>{feedback.event?.title}</h2>
      </header>

      <div className="feedbackCardBody">
        <p className="feedbackQuestion">{feedback.question}</p>

        <div className="rating">
          <label htmlFor={`rating-${feedback._id}`}>Rating</label>

          <select
            id={`rating-${feedback._id}`}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            <option value="">Select rating</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <div className="comment">
          <label htmlFor={`comment-${feedback._id}`}>Review / Comment</label>

          <textarea
            id={`comment-${feedback._id}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Give your review here..."
          />
        </div>
      </div>

      <footer className="feedbackCardFooter">
        <button type="button" onClick={handleSubmit}>
          Submit
        </button>
      </footer>
    </article>
  );
};

export default FeedbackCard;
