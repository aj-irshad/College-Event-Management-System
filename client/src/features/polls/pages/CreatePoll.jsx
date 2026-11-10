import { useState } from "react";
import { createPoll } from "../../../services/pollService";
import "../styles/createPoll.css";
import { useNavigate } from "react-router-dom";
import EventAudienceTargets from "../../events/components/EventAudienceTargets.jsx";

const toLocalDateTimeInput = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toUtcIsoString = (value) => new Date(value).toISOString();

const CreatePoll = () => {
  const [pollQuestion, setPollQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [audienceTargets, setAudienceTargets] = useState([]);

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

    if (audienceTargets.some((target) => !target.semesters?.length)) {
      alert("Select at least one semester for every targeted department.");
      return;
    }

    const cleanOptions = options.map((option) => option.trim());

    if (!pollQuestion.trim()) {
      alert("Please enter a poll question");
      return;
    }

    if (cleanOptions.some((option) => option === "")) {
      alert("Please fill all options");
      return;
    }

    const expiryDate = new Date(expiresAt);
    if (!expiresAt || !Number.isFinite(expiryDate.getTime()) || expiryDate <= new Date()) {
      alert("Please choose a valid future expiry date and time");
      return;
    }

    try {
      const pollData = {
        question: pollQuestion.trim(),
        options: cleanOptions,
        expiresAt: toUtcIsoString(expiresAt),
        audienceTargets,
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

      <EventAudienceTargets value={audienceTargets} onChange={setAudienceTargets} />

      <label className="poll-expiry-field" htmlFor="poll-expires-at">
        Poll expiry date and time
        <input
          id="poll-expires-at"
          type="datetime-local"
          value={expiresAt}
          min={toLocalDateTimeInput(new Date())}
          onChange={(e) => setExpiresAt(e.target.value)}
          required
        />
      </label>

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
