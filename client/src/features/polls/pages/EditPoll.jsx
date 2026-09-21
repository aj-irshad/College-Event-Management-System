import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Save, X } from "lucide-react";

import { fetchPollResult, updatePoll } from "../../../services/pollService.js";
import PollBtn from "../components/PollBtn.jsx";

import "../styles/editPoll.css";

const EditPoll = () => {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch poll
  useEffect(() => {
    const loadPoll = async () => {
      try {
        const response = await fetchPollResult(pollId);
        const poll = response.data.find((poll) => poll._id === pollId);

        setQuestion(poll.question);
        setOptions(poll.options);
      } catch (error) {
        console.error("Error fetching poll:", error);

        alert(error.response?.data?.message || "Failed to fetch poll.");

        navigate("/polls");
      } finally {
        setLoading(false);
      }
    };
    loadPoll();
  }, [pollId, navigate]);

  // Update option
  const handleOptionChange = (index, value) => {
    setOptions((prevOptions) =>
      prevOptions.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    );
  };

  // Add new option
  const handleAddOption = () => {
    setOptions((prevOptions) => [...prevOptions, ""]);
  };

  // Remove option
  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      alert("A poll must have at least 2 options.");
      return;
    }

    setOptions((prevOptions) =>
      prevOptions.filter((_, optionIndex) => optionIndex !== index),
    );
  };

  // Submit updated poll
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Update polls 1");

    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((option) => option.trim());
    // Validate question
    if (!trimmedQuestion) {
      alert("Please enter a poll question.");
      return;
    }

    // Validate options
    if (trimmedOptions.some((option) => !option)) {
      alert("Please fill in all poll options.");
      return;
    }

    // Validate duplicate options
    const uniqueOptions = new Set(trimmedOptions);

    if (uniqueOptions.size !== trimmedOptions.length) {
      alert("Poll options must be unique.");
      return;
    }

    try {
      console.log("Update polls 2");
      setSaving(true);
      await updatePoll(pollId, {
        question: trimmedQuestion,
        options: trimmedOptions,
      });

      console.log("Update polls 3");
      alert("Poll updated successfully.");

      navigate("/polls");
    } catch (error) {
      console.error("Error updating poll:", error);

      alert(error.response?.data?.message || "Failed to update poll.");
    } finally {
      setSaving(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="edit-poll-loading">
        <p>Loading poll...</p>
      </div>
    );
  }

  return (
    <div className="edit-poll-page">
      <div className="edit-poll-container">
        {/* Header */}
        <div className="edit-poll-header">
          <h1>Edit Poll</h1>
          <p>Update the poll question and options.</p>
        </div>

        <form className="edit-poll-form" onSubmit={handleSubmit}>
          {/* Question */}
          <div className="form-group">
            <label htmlFor="poll-question">Poll Question</label>

            <input
              id="poll-question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter poll question"
              disabled={saving}
            />
          </div>

          {/* Options */}
          <div className="form-group">
            <div className="options-header">
              <label>Poll Options</label>

              <PollBtn
                text="Add Option"
                onClick={handleAddOption}
                icon={<Plus size={16} />}
                disabled={saving}
              />
            </div>

            <div className="options-list">
              {options.map((option, index) => (
                <div className="option-input-row" key={index}>
                  <span className="option-number">{index + 1}.</span>

                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    disabled={saving}
                  />

                  <button
                    type="button"
                    className="remove-option-btn"
                    onClick={() => handleRemoveOption(index)}
                    disabled={saving || options.length <= 2}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="edit-poll-actions">
            <PollBtn
              text="Cancel"
              icon={<X size={18} />}
              onClick={() => navigate(-1)}
              className="cancel-btn"
            />

            <PollBtn
              text="Update Poll"
              icon={<Save size={18} />}
              type="submit"
              className="update-poll-btn"
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPoll;
