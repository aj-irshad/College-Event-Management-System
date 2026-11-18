import { useEffect, useState } from "react";
import { Download, Eye, FileText, X } from "lucide-react";
import { getEventAttachmentFile } from "../../../services/eventService.js";
import "../styles/eventAttachments.css";

const formatFileSize = (size = 0) => size < 1024 * 1024
  ? `${Math.max(1, Math.round(size / 1024))} KB`
  : `${(size / (1024 * 1024)).toFixed(1)} MB`;

const EventAttachments = ({ eventId, attachments = [] }) => {
  const [preview, setPreview] = useState(null);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
  }, [preview]);

  const openPreview = async (attachment) => {
    setError("");
    setLoadingId(String(attachment._id));
    try {
      const blob = await getEventAttachmentFile(eventId, attachment._id);
      const objectUrl = URL.createObjectURL(blob);
      setPreview({ ...attachment, objectUrl });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not open this attachment. Please try again.");
    } finally {
      setLoadingId("");
    }
  };

  const downloadAttachment = async (attachment) => {
    setError("");
    setLoadingId(String(attachment._id));
    try {
      const blob = await getEventAttachmentFile(eventId, attachment._id, true);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.originalFilename || "event-attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not download this attachment. Please try again.");
    } finally {
      setLoadingId("");
    }
  };

  const closePreview = () => {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
  };

  if (!attachments.length) return null;

  return (
    <section className="event-attachments" aria-labelledby="event-attachments-title">
      <h3 id="event-attachments-title">Event attachments</h3>
      <ul className="event-attachments-list">
        {attachments.map((attachment) => {
          const canPreview = attachment.mimeType?.startsWith("image/") || attachment.mimeType === "application/pdf";
          const isLoading = loadingId === String(attachment._id);
          return (
            <li className="event-attachment-item" key={attachment._id}>
              <FileText size={20} aria-hidden="true" />
              <div className="event-attachment-details">
                <strong title={attachment.originalFilename}>{attachment.originalFilename}</strong>
                <span>{attachment.format?.toUpperCase()} · {formatFileSize(attachment.size)}</span>
              </div>
              <div className="event-attachment-actions">
                {canPreview && (
                  <button type="button" onClick={() => openPreview(attachment)} disabled={Boolean(loadingId)}>
                    <Eye size={16} /> {isLoading ? "Opening…" : "Preview"}
                  </button>
                )}
                <button type="button" onClick={() => downloadAttachment(attachment)} disabled={Boolean(loadingId)}>
                  <Download size={16} /> {isLoading && !canPreview ? "Preparing…" : "Download"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="event-attachments-error" role="alert">{error}</p>}

      {preview && (
        <div className="event-attachment-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}>
          <section className="event-attachment-modal" role="dialog" aria-modal="true" aria-label={`Preview ${preview.originalFilename}`}>
            <header>
              <h4>{preview.originalFilename}</h4>
              <button type="button" className="event-attachment-close" onClick={closePreview} aria-label="Close preview"><X size={20} /></button>
            </header>
            {preview.mimeType?.startsWith("image/") ? (
              <img src={preview.objectUrl} alt={preview.originalFilename} />
            ) : (
              <iframe src={preview.objectUrl} title={`Preview ${preview.originalFilename}`} />
            )}
          </section>
        </div>
      )}
    </section>
  );
};

export default EventAttachments;
