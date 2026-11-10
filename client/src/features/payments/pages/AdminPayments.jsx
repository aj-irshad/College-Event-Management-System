import { useCallback, useEffect, useState } from "react";
import socket from "../../../api/socket";
import { getAdminPayments, getAdminRevenue, getPaymentProof, reviewPayment } from "../../../services/payment";
import "../styles/payments.css";

const AdminPayments = () => {
  const [status, setStatus] = useState("Pending");
  const [payments, setPayments] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofType, setProofType] = useState("");

  const load = useCallback(async () => {
    try {
      const [paymentResponse, revenueResponse] = await Promise.all([getAdminPayments(status), getAdminRevenue()]);
      setPayments(Array.isArray(paymentResponse.data) ? paymentResponse.data : []);
      setRevenue(Array.isArray(revenueResponse.data) ? revenueResponse.data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load payment review data.");
    } finally {
      setLoading(false);
    }
  }, [status]);

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

  const decide = async (payment, decision) => {
    const rejectionReason = decision === "Rejected"
      ? window.prompt("Enter a reason for rejecting this payment:")?.trim()
      : "";
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
        <h2>Approved event revenue</h2>
        {revenue.length ? <div className="payment-revenue-grid">{revenue.map((row) => <article className="payment-revenue-card" key={row.event._id}><strong>{row.event.title}</strong><span>NPR {Number(row.revenue).toFixed(2)}</span><small>{row.approvedPaymentCount} approved payment{row.approvedPaymentCount === 1 ? "" : "s"}</small></article>)}</div> : <p>No approved payments have been recorded.</p>}
      </section>
      <label className="payment-filter-label">Payment status
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {["Pending", "Approved", "Rejected", "All"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      {error && <p className="payment-error" role="alert">{error}</p>}
      {message && <p className="payment-success" role="status">{message}</p>}
      {loading ? <p role="status">Loading payment submissions…</p> : payments.length === 0 ? <section className="payment-empty">No {status.toLowerCase()} payment submissions.</section> : (
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
