import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { participateInEvent } from "../../../services/participantService";
import "../styles/participateEvent.css";

const ParticipateEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [participationType, setParticipationType] = useState("Participant");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await participateInEvent({
        eventId,
        participationType,
      });

      alert("Successfully participated in the event");
      navigate("/upcoming-events");
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Failed to participate in event");
    }
  };

  return (
    <section className="participatePage">
      <header className="participateHeader">
        <h1>Participate in Event</h1>

        <p>Select how you would like to participate in this event.</p>
      </header>

      <form className="participateForm" onSubmit={handleSubmit}>
        <div className="participationOptions">
          <label className="participationOption">
            <input
              type="radio"
              name="participationType"
              value="Participant"
              checked={participationType === "Participant"}
              onChange={(e) => setParticipationType(e.target.value)}
            />

            <span>Participant</span>
          </label>

          <label className="participationOption">
            <input
              type="radio"
              name="participationType"
              value="Volunteer"
              checked={participationType === "Volunteer"}
              onChange={(e) => setParticipationType(e.target.value)}
            />

            <span>Volunteer</span>
          </label>

          <label className="participationOption">
            <input
              type="radio"
              name="participationType"
              value="Organizing Member"
              checked={participationType === "Organizing Member"}
              onChange={(e) => setParticipationType(e.target.value)}
            />

            <span>Organizing Member</span>
          </label>
        </div>

        <div className="participateActions">
          <button
            type="button"
            className="participateCancelBtn"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>

          <button type="submit" className="participateSubmitBtn">
            Participate
          </button>
        </div>
      </form>
    </section>
  );
};

export default ParticipateEvent;
