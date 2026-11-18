import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LoaderCircle, RotateCw } from "lucide-react";
import { getEventById } from "../../../services/eventService";
import { participateInEvent } from "../../../services/participantService";
import { getEventPaymentQr, submitManualPayment } from "../../../services/payment";
import { useNotifications } from "../../../context/NotificationContext.jsx";
import "../styles/participateEvent.css";

const proofMimeByExtension = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const getQrErrorMessage = async (requestError) => {
  let data = requestError.response?.data;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }
  return data?.message || "The payment QR could not be loaded. Check your connection and try again.";
};

const ParticipateEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [participationType, setParticipationType] = useState("Participant");
  const [event, setEvent] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrEventId, setQrEventId] = useState("");
  const [qrError, setQrError] = useState("");
  const [qrCanRetry, setQrCanRetry] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrRetryAttempt, setQrRetryAttempt] = useState(0);
  const [proof, setProof] = useState(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState("");
  const [proofError, setProofError] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEvent(null);
    setProof(null);
    setProofError("");
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
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Could not load event details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadEvent();
    return () => {
      active = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!event || String(event._id) !== String(eventId) || Number(event.price) <= 0 || event.status === "Completed") {
      setQrLoading(false);
      setQrUrl("");
      setQrEventId("");
      setQrError("");
      setQrCanRetry(false);
      return undefined;
    }

    let active = true;
    let objectUrl = "";
    setQrLoading(true);
    setQrUrl("");
    setQrEventId("");
    setQrError("");
    setQrCanRetry(false);

    const loadQr = async () => {
      try {
        const response = await getEventPaymentQr(eventId);
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setQrUrl(objectUrl);
        setQrEventId(String(eventId));
      } catch (requestError) {
        if (!active) return;
        const message = await getQrErrorMessage(requestError);
        if (!active) return;
        setQrError(message);
        const status = requestError.response?.status;
        setQrCanRetry(!status || status >= 500);
      } finally {
        if (active) setQrLoading(false);
      }
    };

    void loadQr();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eventId, event?._id, event?.price, event?.status, qrRetryAttempt]);

  useEffect(() => {
    if (!proof) {
      setProofPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(proof);
    setProofPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [proof]);

  const isCurrentEvent = Boolean(event && String(event._id) === String(eventId));
  const hasCurrentQr = Boolean(qrUrl && qrEventId === String(eventId));

  const handleProofChange = (inputEvent) => {
    const file = inputEvent.target.files?.[0] || null;
    setProofError("");
    if (!file) {
      setProof(null);
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !proofMimeByExtension[extension] || file.type !== proofMimeByExtension[extension]) {
      setProof(null);
      inputEvent.target.value = "";
      setProofError("Choose a JPG, JPEG, PNG, or WEBP image. PDF and other documents are not accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProof(null);
      inputEvent.target.value = "";
      setProofError("The payment proof image must be 5 MB or smaller.");
      return;
    }
    setProof(file);
  };

  const handleSubmit = async (eventSubmit) => {
    eventSubmit.preventDefault();
    if (!isCurrentEvent || loading || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (Number(event.price) > 0) {
        if (!proof) throw new Error("Upload a payment confirmation screenshot or photo first.");
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
      notify("success", "Successfully participated in the event.");
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
            {hasCurrentQr ? (
              <img className="payment-qr-image" src={qrUrl} alt="eSewa payment QR code" onError={() => {
                setQrError("The payment QR image could not be displayed. Please retry.");
                setQrCanRetry(true);
                setQrUrl("");
                setQrEventId("");
              }} />
            ) : qrLoading ? (
              <div className="payment-qr-state" role="status"><LoaderCircle className="payment-spinner" size={20} />Loading eSewa QR…</div>
            ) : qrError ? (
              <div className="payment-qr-state payment-qr-error" role="alert">
                <span>{qrError}</span>
                {qrCanRetry && <button type="button" className="payment-qr-retry" onClick={() => setQrRetryAttempt((attempt) => attempt + 1)}><RotateCw size={15} /> Retry QR</button>}
              </div>
            ) : null}
            {qrError.includes("already exists") && <p><Link to="/payment-submissions">View your payment submissions</Link></p>}
            <label className="payment-proof-field">
              <span>Upload Payment Screenshot</span>
              <span className="payment-proof-help">Upload a screenshot or photo of your payment confirmation or receipt. Accepted: JPG, JPEG, PNG, WEBP · Max 5 MB. PDF and other documents are not accepted.</span>
              <input key={eventId} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleProofChange} disabled={submitting} />
              {proofPreviewUrl && <img className="payment-proof-preview" src={proofPreviewUrl} alt="Selected payment proof preview" />}
              {proofError && <small className="payment-proof-error" role="alert">{proofError}</small>}
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
