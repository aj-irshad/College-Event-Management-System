import { useState } from "react";
import { createPoll } from "../../../services/pollService";
import "../styles/createPoll.css";
import { useNavigate } from "react-router-dom";

const CreatePoll = () => {
  const [pollQuestion, setPollQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const navigate = useNavigate();

  const handleOptionChange = (e, index) => {
    const newOptions = [...options];
    newOptions[index] = e.target.value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanOptions = options.map((option) => option.trim());

    if (!pollQuestion.trim()) {
      alert("Please enter a poll question");
      return;
    }

    if (cleanOptions.some((option) => option === "")) {
      alert("Please fill all options");
      return;
    }

    try {
      const pollData = {
        question: pollQuestion.trim(),
        options: cleanOptions,
      };

      const response = await createPoll(pollData);

      alert(response.data.message);
      navigate("/polls");
    } catch (err) {
      console.log(err.message);
      alert("Failed to create poll");
    }
  };

  return (
    <form className="createPollQuestion" onSubmit={handleSubmit}>
      <h2>What will be the poll for?</h2>

      <input
        type="text"
        value={pollQuestion}
        onChange={(e) => setPollQuestion(e.target.value)}
        placeholder="Type your question here..."
        required
      />

      <p className="optionTitle">Options Here (Max: 5)</p>

      <div className="optionsList">
        {options.map((option, index) => (
          <input
            key={index}
            type="text"
            value={option}
            onChange={(e) => handleOptionChange(e, index)}
            placeholder={`Option ${index + 1}`}
            className="optionInput"
            required
          />
        ))}
      </div>

      <div className="pollActions">
        <button
          type="button"
          className="addOptionButton"
          onClick={addOption}
          disabled={options.length >= 5}
        >
          + Add Option
        </button>

        <button type="submit" className="createPollButton">
          Create Poll
        </button>
      </div>
    </form>
  );
};

export default CreatePoll;
