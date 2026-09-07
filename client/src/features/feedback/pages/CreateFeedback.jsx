import { useParams } from "react-router-dom";
import { useState } from "react";
import { createFeedback } from "../../../services/feedbackService";

const CreateFeedback = () => {
  const { eventId } = useParams();
  const [question, setQuestion] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const feedbackData = {
        event: eventId,
        question,
      };

      console.log(feedbackData);
      await createFeedback(feedbackData);
      setQuestion[" "];
      alert("Feedback created successfully");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
