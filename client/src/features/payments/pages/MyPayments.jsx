import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import socket from "../../../api/socket";
import { getMyPayments, getPaymentProof } from "../../../services/payment";
import "../styles/payments.css";

const MyPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofType, setProofType] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await getMyPayments();
      setPayments(Array.isArray(data) ? data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load payment submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    socket.on("payments:status-updated", load);
    socket.on("connect", load);
    return () => {
      socket.off("payments:status-updated", load);
      socket.off("connect", load);
    };
  }, [load]);

  useEffect(() => () => { if (proofUrl) URL.revokeObjectURL(proofUrl); }, [proofUrl]);

  const showProof = async (payment) => {
    try {
      const url = await getPaymentProof(payment.proofUrl);
      setProofType(payment.proofMimeType || "");
      setProofUrl(url);
    } catch {
      setError("Could not open this payment proof.");
    }
  };

  return (
    <main className="payment-page">
      <header className="payment-page-header">
        <div><h1>My Payment Submissions</h1><p>Manual eSewa payments remain pending until reviewed by an administrator.</p></div>
        <Link to="/upcoming-events">Browse events</Link>
      </header>
      {error && <p className="payment-error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading payment submissions…</p> : payments.length === 0 ? (
        <section className="payment-empty">No payment proofs submitted yet.</section>
      ) : (
        <div className="payment-table-wrap"><table className="payment-table">
          <thead><tr><th>Event</th><th>Amount</th><th>Submitted</th><th>Status</th><th>Reference</th><th>Details</th></tr></thead>
          <tbody>{payments.map((payment) => (
            <tr key={payment._id}>
              <td>{payment.event?.title || "Event unavailable"}</td>
              <td>NPR {Number(payment.amount).toFixed(2)}</td>
              <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "—"}</td>
              <td><span className={`manual-payment-status ${payment.status.toLowerCase()}`}>{payment.status}</span>{payment.status === "Rejected" && payment.rejectionReason && <small className="payment-rejection-reason">{payment.rejectionReason}</small>}</td>
              <td>{payment.transactionReference || "—"}</td>
              <td><button type="button" className="payment-secondary-btn" onClick={() => showProof(payment)}>View proof</button>{payment.status === "Rejected" && payment.event?._id && <Link className="payment-retry-link" to={`/participate/${payment.event._id}`}>Submit new proof</Link>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {proofUrl && <div className="payment-modal-backdrop" role="presentation" onClick={() => setProofUrl("")}>
        <section className="payment-proof-modal" role="dialog" aria-modal="true" aria-label="Payment proof" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="payment-close-btn" onClick={() => setProofUrl("")}>Close</button>
          {proofType === "application/pdf" ? <a className="payment-pdf-download" href={proofUrl} download="payment-proof.pdf">Download PDF receipt to review</a> : <img src={proofUrl} alt="Uploaded payment proof" />}
        </section>
      </div>}
    </main>
  );
};

export default MyPayments;
