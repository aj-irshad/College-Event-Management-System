import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getEventById } from "../../../services/eventService";
import { participateInEvent } from "../../../services/participantService";
import { getEventPaymentQr, submitManualPayment } from "../../../services/payment";
import "../styles/participateEvent.css";

const ParticipateEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [participationType, setParticipationType] = useState("Participant");
  const [event, setEvent] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrEventId, setQrEventId] = useState("");
  const [qrError, setQrError] = useState("");
  const [proof, setProof] = useState(null);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setLoading(true);
    setEvent(null);
    setQrUrl("");
    setQrEventId("");
    setQrError("");
    setProof(null);
    setReference("");
    setError("");
    const loadEvent = async () => {
      try {
        const { data } = await getEventById(eventId);
        if (!active) return;
        if (String(data?._id) !== String(eventId)) {
          throw new Error("The event returned by the server does not match this page.");
        }
        setEvent(data);
        if (Number(data.price) > 0 && data.status !== "Completed") {
          try {
            const qrResponse = await getEventPaymentQr(eventId);
            if (!active) return;
            objectUrl = URL.createObjectURL(qrResponse.data);
            setQrUrl(objectUrl);
            setQrEventId(String(eventId));
          } catch (qrRequestError) {
            if (active) setQrError(qrRequestError.response?.data?.message || "The payment QR could not be loaded.");
          }
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Could not load event details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadEvent();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eventId]);

  const isCurrentEvent = Boolean(event && String(event._id) === String(eventId));
  const hasCurrentQr = Boolean(qrUrl && qrEventId === String(eventId));

  const handleSubmit = async (eventSubmit) => {
    eventSubmit.preventDefault();
    if (!isCurrentEvent || loading || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (Number(event.price) > 0) {
        if (!proof) throw new Error("Choose your payment screenshot or PDF receipt first.");
        const formData = new FormData();
        formData.append("eventId", eventId);
        formData.append("participationType", participationType);
        formData.append("transactionReference", reference.trim());
        formData.append("proof", proof);
        await submitManualPayment(formData);
        navigate("/payment-submissions");
        return;
      }

      await participateInEvent({ eventId, participationType });
      alert("Successfully participated in the event");
      navigate("/upcoming-events");
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not submit registration.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (!isCurrentEvent && !error)) return <section className="participatePage" role="status">Loading event…</section>;
  if (!event) return <section className="participatePage"><p className="participateError" role="alert">{error || "Event not found."}</p></section>;
  const isPaid = Number(event.price) > 0;

  return (
    <section className="participatePage">
      <header className="participateHeader">
        <h1>Register for {event.title}</h1>
        <p>Select how you would like to participate in this event.</p>
      </header>
      {error && <p className="participateError" role="alert">{error}</p>}
      {event.status === "Completed" && <p className="participateError" role="alert">Registration for this event is closed.</p>}

      <form className="participateForm" onSubmit={handleSubmit}>
        <div className="participationOptions">
          {["Participant", "Volunteer", "Organizing Member"].map((type) => (
            <label className="participationOption" key={type}>
              <input type="radio" name="participationType" value={type} checked={participationType === type} onChange={(e) => setParticipationType(e.target.value)} disabled={submitting || event.status === "Completed"} />
              <span>{type}</span>
            </label>
          ))}
        </div>

        {isPaid && (
          <div className="paymentGatewaySection">
            <h3>Manual eSewa QR payment · NPR {Number(event.price).toFixed(2)}</h3>
            <p>Pay the exact amount shown above. Your participation is confirmed only after an administrator reviews your proof.</p>
            {hasCurrentQr ? <img className="payment-qr-image" src={qrUrl} alt="eSewa payment QR code" /> : <p role="alert">{qrError || "Loading payment QR…"}</p>}
            {qrError.includes("already exists") && <p><Link to="/payment-submissions">View your payment submissions</Link></p>}
            <label className="payment-proof-field">
              <span>Payment screenshot or PDF receipt (max 5 MB)</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(e) => setProof(e.target.files?.[0] || null)} disabled={submitting} />
            </label>
            <label className="payment-reference-field">
              <span>eSewa transaction reference (optional)</span>
              <input type="text" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} disabled={submitting} />
            </label>
          </div>
        )}

        <div className="participateActions">
          <button type="button" className="participateCancelBtn" onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
          <button type="submit" className="participateSubmitBtn" disabled={!isCurrentEvent || submitting || event.status === "Completed" || (isPaid && !hasCurrentQr)}>
            {submitting ? "Submitting…" : isPaid ? "Submit payment proof" : "Participate"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ParticipateEvent;
