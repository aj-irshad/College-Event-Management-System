import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { participateInEvent } from "../../../services/participantService";
import {
  initiateEsewaPayment,
  initiateKhaltiPayment,
} from "../../../services/payment";
import "../styles/participateEvent.css";

const ParticipateEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [participationType, setParticipationType] = useState("Participant");
  const [paymentMethod, setPaymentMethod] = useState("esewa");
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch event details to check price
  useEffect(() => {
    // Replace with your actual event fetch hook/service
    fetch(`/events/${eventId}`)
      .then((res) => res.json())
      .then((data) => setEvent(data))
      .catch((err) => console.error("Error fetching event:", err));
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If event is paid, trigger the respective payment gateway sandbox
      if (event && event.price && event.price > 0) {
        if (paymentMethod === "esewa") {
          initiateEsewaPayment(event, event.price);
          return; // Redirects away
        } else if (paymentMethod === "khalti") {
          await initiateKhaltiPayment(event, event.price);
          return; // Redirects away
        }
      }

      // Free event standard registration
      await participateInEvent({
        eventId,
        participationType,
      });

      alert("Successfully participated in the event");
      navigate("/upcoming-events");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to participate in event");
    } finally {
      setLoading(false);
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

        {/* Payment Method Selection (Only show if event is paid) */}
        {event?.price > 0 && (
          <div className="paymentGatewaySection" style={{ marginTop: "20px" }}>
            <h3>Select Payment Method (Rs {event.price})</h3>
            <div className="participationOptions">
              <label className="participationOption">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="esewa"
                  checked={paymentMethod === "esewa"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>eSewa Sandbox</span>
              </label>

              <label className="participationOption">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="khalti"
                  checked={paymentMethod === "khalti"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Khalti Sandbox</span>
              </label>
            </div>
          </div>
        )}

        <div className="participateActions">
          <button
            type="button"
            className="participateCancelBtn"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="participateSubmitBtn"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : event?.price > 0
                ? `Pay & Participate`
                : "Participate"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ParticipateEvent;
