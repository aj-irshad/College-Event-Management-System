import { useCallback, useEffect, useState } from "react";
import socket from "../../../api/socket";
import { getAdminPayments, getAdminRevenue, getPaymentProof, reviewPayment } from "../../../services/payment";
import { useNotifications } from "../../../context/NotificationContext.jsx";
import "../styles/payments.css";

const AdminPayments = () => {
  const [status, setStatus] = useState("Pending");
  const [eventFilter, setEventFilter] = useState("");
  const [payments, setPayments] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofType, setProofType] = useState("");
  const { confirm, prompt } = useNotifications();

  const load = useCallback(async () => {
    try {
      const [paymentResponse, revenueResponse] = await Promise.all([getAdminPayments(status, eventFilter), getAdminRevenue()]);
      setPayments(Array.isArray(paymentResponse.data) ? paymentResponse.data : []);
      setRevenue(Array.isArray(revenueResponse.data) ? revenueResponse.data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load payment review data.");
    } finally {
      setLoading(false);
    }
  }, [status, eventFilter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    socket.on("payments:updated", load);
    socket.on("connect", load);
    return () => {
      socket.off("payments:updated", load);
      socket.off("connect", load);
    };
  }, [load]);

  useEffect(() => () => { if (proofUrl) URL.revokeObjectURL(proofUrl); }, [proofUrl]);

  const openProof = async (payment) => {
    try {
      const url = await getPaymentProof(payment.proofUrl);
      setProofType(payment.proofMimeType || "");
      setProofUrl(url);
    } catch {
      setError("Could not open the uploaded proof.");
    }
  };

  const reviewEventPayments = (eventId) => {
    setEventFilter(eventId);
    setStatus("All");
    document.getElementById("payment-submissions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const decide = async (payment, decision) => {
    if (busyId) return;
    let rejectionReason = "";
    if (decision === "Rejected") {
      rejectionReason = await prompt({
        title: "Reject payment submission?",
        message: "Enter the reason the user will see. Submitting this form confirms the rejection.",
        label: "Rejection reason",
        placeholder: "Explain why the proof was rejected",
        confirmText: "Reject payment",
        destructive: true,
        required: true,
        maxLength: 1000,
        multiline: true,
      });
    } else {
      const accepted = await confirm({
        title: "Approve payment?",
        message: "This verifies the submitted payment and confirms the associated participation.",
        confirmText: "Approve payment",
      });
      if (!accepted) return;
    }
    if (decision === "Rejected" && !rejectionReason) return;
    setBusyId(payment._id);
    setError("");
    setMessage("");
    try {
      await reviewPayment(payment._id, decision, rejectionReason);
      setMessage(`Payment ${decision.toLowerCase()} successfully.`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Could not ${decision.toLowerCase()} payment.`);
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="payment-page">
      <header className="payment-page-header"><div><h1>Payment Review</h1><p>Verify eSewa QR receipts manually before confirming registration.</p></div></header>
      <section className="payment-revenue-section">
        <h2>Paid events</h2>
        {revenue.length ? <div className="payment-table-wrap"><table className="payment-table paid-event-table">
          <thead><tr><th>Event title</th><th>Start</th><th>End</th><th>No. of participation</th><th>Amount collected</th></tr></thead>
          <tbody>{revenue.map((row) => <tr key={row.event._id}>
            <td><button type="button" className="payment-event-review-link" onClick={() => reviewEventPayments(row.event._id)} aria-label={`Review payments for ${row.event.title}`}>{row.event.title}</button></td>
            <td>{row.event.start_at ? new Date(row.event.start_at).toLocaleString() : "—"}</td>
            <td>{row.event.end_at ? new Date(row.event.end_at).toLocaleString() : "—"}</td>
            <td>{row.approvedParticipationCount}</td>
            <td className="payment-collected-amount">NPR {Number(row.revenue).toFixed(2)}</td>
          </tr>)}</tbody>
        </table></div> : <section className="payment-empty">No paid events are available.</section>}
      </section>
      <section id="payment-submissions" className="payment-submission-section">
        <div className="payment-submissions-heading"><div><h2>Payment submissions</h2><p>Open a proof to inspect it, then approve or reject pending submissions.</p></div>
          {eventFilter && <button type="button" className="payment-secondary-btn" onClick={() => setEventFilter("")}>Show all events</button>}
        </div>
        <label className="payment-filter-label">Payment status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {["Pending", "Approved", "Rejected", "All"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      {error && <p className="payment-error" role="alert">{error}</p>}
      {message && <p className="payment-success" role="status">{message}</p>}
      {loading ? <p role="status">Loading payment submissions…</p> : payments.length === 0 ? <section className="payment-empty">No {status.toLowerCase()} payment submissions{eventFilter ? " for this event" : ""}.</section> : (
        <div className="payment-table-wrap"><table className="payment-table">
          <thead><tr><th>Participant</th><th>Event</th><th>Amount</th><th>Reference</th><th>Submitted</th><th>Status</th><th>Proof</th><th>Review</th></tr></thead>
          <tbody>{payments.map((payment) => <tr key={payment._id}>
            <td><strong>{payment.user?.name || "Unknown user"}</strong><small>{payment.user?.email || ""}</small></td>
            <td>{payment.event?.title || "Event unavailable"}</td>
            <td>NPR {Number(payment.amount).toFixed(2)}</td>
            <td>{payment.transactionReference || "—"}</td>
            <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "—"}</td>
            <td><span className={`manual-payment-status ${payment.status.toLowerCase()}`}>{payment.status}</span>{payment.rejectionReason && <small className="payment-rejection-reason">{payment.rejectionReason}</small>}</td>
            <td><button className="payment-secondary-btn" type="button" onClick={() => openProof(payment)}>Open proof</button></td>
            <td>{payment.status === "Pending" ? <div className="payment-review-actions"><button type="button" disabled={busyId === payment._id} onClick={() => decide(payment, "Approved")}>Approve</button><button type="button" disabled={busyId === payment._id} onClick={() => decide(payment, "Rejected")}>Reject</button></div> : payment.reviewedAt ? new Date(payment.reviewedAt).toLocaleDateString() : "—"}</td>
          </tr>)}</tbody>
        </table></div>
      )}
      </section>
      {proofUrl && <div className="payment-modal-backdrop" role="presentation" onClick={() => setProofUrl("")}>
        <section className="payment-proof-modal" role="dialog" aria-modal="true" aria-label="Payment proof" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="payment-close-btn" onClick={() => setProofUrl("")}>Close</button>
          {proofType === "application/pdf" ? <a className="payment-pdf-download" href={proofUrl} download="payment-proof.pdf">Download PDF receipt to review</a> : <img src={proofUrl} alt="Uploaded payment proof" />}
        </section>
      </div>}
    </main>
  );
};

export default AdminPayments;
