import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { createFeedback } from "../../../services/feedbackService";

import "../styles/createFeedback.css";

const CreateFeedback = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [question, setQuestion] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const feedbackData = {
        event: eventId,
        question,
      };
      await createFeedback(feedbackData);
      setQuestion("");
      alert("Feedback created successfully");
      navigate("/feedback");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form className="createFeedback" onSubmit={handleSubmit}>
      <h2>Create Feedback</h2>

      <input
        type="text"
        placeholder="Enter feedback question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button type="submit">Create Feedback</button>
    </form>
  );
};

export default CreateFeedback;
