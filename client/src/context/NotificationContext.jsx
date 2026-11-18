import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleX, Info, TriangleAlert, X } from "lucide-react";
import "../styles/notificationSystem.css";

const NotificationContext = createContext(null);
const toastIcons = {
  success: CheckCircle2,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
};
const toastTitles = {
  success: "Success",
  error: "Something went wrong",
  warning: "Please check",
  info: "Information",
};

const ToastViewport = ({ items, onDismiss }) => createPortal(
  <div className="ems-toast-viewport" aria-label="Notifications" aria-live="polite" aria-relevant="additions text">
    {items.map((item) => {
      const Icon = toastIcons[item.type] || Info;
      return (
        <article className={`ems-toast ems-toast-${item.type}${item.leaving ? " is-leaving" : ""}`} key={item.id} role={item.type === "error" ? "alert" : "status"}>
          <Icon className="ems-toast-icon" size={21} aria-hidden="true" />
          <div className="ems-toast-copy">
            <strong>{item.title}</strong>
            <p>{item.message}</p>
          </div>
          <button className="ems-toast-close" type="button" onClick={() => onDismiss(item.id)} aria-label="Dismiss notification"><X size={17} /></button>
        </article>
      );
    })}
  </div>,
  document.body,
);

const DialogView = ({ request, onResolve }) => {
  const [value, setValue] = useState("");
  const dialogRef = useRef(null);
  const initialFocusRef = useRef(null);

  useEffect(() => {
    setValue(request?.options.initialValue || "");
    if (!request) return undefined;
    const previousFocus = document.activeElement;
    const focusTimer = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onResolve(request.kind === "prompt" ? null : false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [request, onResolve]);

  if (!request) return null;
  const { options } = request;
  const isPrompt = request.kind === "prompt";
  const closeValue = isPrompt ? null : false;
  const canSubmit = !isPrompt || !options.required || Boolean(value.trim());
  const headingId = `ems-dialog-title-${request.id}`;
  const messageId = `ems-dialog-message-${request.id}`;

  return createPortal(
    <div className="ems-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onResolve(closeValue);
    }}>
      <section className="ems-dialog" role={isPrompt ? "dialog" : "alertdialog"} aria-modal="true" aria-labelledby={headingId} aria-describedby={messageId} ref={dialogRef}>
        <div className={`ems-dialog-mark${options.destructive ? " is-destructive" : ""}`} aria-hidden="true">
          {options.destructive ? <TriangleAlert size={23} /> : <Info size={23} />}
        </div>
        <h2 id={headingId}>{options.title || (isPrompt ? "Please provide a response" : "Confirm action")}</h2>
        {options.message && <p id={messageId}>{options.message}</p>}
        {isPrompt && (
          <label className="ems-dialog-field">
            <span>{options.label || "Response"}{options.required ? " *" : ""}</span>
            {options.multiline ? (
              <textarea ref={initialFocusRef} value={value} maxLength={options.maxLength || 1000} placeholder={options.placeholder || "Enter a response"} onChange={(event) => setValue(event.target.value)} rows={4} />
            ) : (
              <input ref={initialFocusRef} type="text" value={value} maxLength={options.maxLength || 500} placeholder={options.placeholder || "Enter a response"} onChange={(event) => setValue(event.target.value)} />
            )}
          </label>
        )}
        <div className="ems-dialog-actions">
          <button type="button" className="ems-dialog-cancel" ref={isPrompt ? undefined : initialFocusRef} onClick={() => onResolve(closeValue)}>{options.cancelText || "Cancel"}</button>
          <button type="button" className={`ems-dialog-confirm${options.destructive ? " is-destructive" : ""}`} disabled={!canSubmit} onClick={() => onResolve(isPrompt ? value.trim() : true)}>{options.confirmText || (isPrompt ? "Continue" : "Confirm")}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);
  const dialogQueueRef = useRef([]);
  const toastTimersRef = useRef(new Map());
  const recentToastsRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer) window.clearTimeout(existingTimer);
    setToasts((items) => items.map((item) => item.id === id ? { ...item, leaving: true } : item));
    const timer = window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
      toastTimersRef.current.delete(id);
    }, 180);
    toastTimersRef.current.set(id, timer);
  }, []);

  const notify = useCallback((type, message, title) => {
    const normalizedType = toastIcons[type] ? type : "info";
    const text = String(message ?? "").trim();
    if (!text) return;
    const normalizedTitle = title || toastTitles[normalizedType];
    const duplicateKey = `${normalizedType}:${normalizedTitle}:${text}`;
    const now = Date.now();
    if (now - (recentToastsRef.current.get(duplicateKey) || 0) < 1600) return;
    recentToastsRef.current.set(duplicateKey, now);
    for (const [key, timestamp] of recentToastsRef.current) {
      if (now - timestamp > 10000) recentToastsRef.current.delete(key);
    }
    const id = `${now}-${Math.random().toString(36).slice(2)}`;
    const duration = normalizedType === "error" ? 6500 : 4800;
    setToasts((items) => [...items.slice(-3), { id, type: normalizedType, title: normalizedTitle, message: text, leaving: false }]);
    toastTimersRef.current.set(id, window.setTimeout(() => dismissToast(id), duration));
  }, [dismissToast]);

  const requestDialog = useCallback((kind, options = {}) => new Promise((resolve) => {
    const request = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind, options, resolve };
    if (!dialogRef.current) {
      dialogRef.current = request;
      setDialog(request);
    } else {
      dialogQueueRef.current.push(request);
    }
  }), []);

  const resolveDialog = useCallback((result) => {
    const current = dialogRef.current;
    if (!current) return;
    current.resolve(result);
    const next = dialogQueueRef.current.shift() || null;
    dialogRef.current = next;
    setDialog(next);
  }, []);

  const confirm = useCallback((options) => requestDialog("confirm", typeof options === "string" ? { message: options } : options), [requestDialog]);
  const prompt = useCallback((options) => requestDialog("prompt", typeof options === "string" ? { message: options } : options), [requestDialog]);

  useEffect(() => () => {
    for (const timer of toastTimersRef.current.values()) window.clearTimeout(timer);
    for (const pending of [dialogRef.current, ...dialogQueueRef.current].filter(Boolean)) pending.resolve(pending.kind === "prompt" ? null : false);
    dialogQueueRef.current = [];
    dialogRef.current = null;
  }, []);

  const value = useMemo(() => ({ notify, confirm, prompt }), [notify, confirm, prompt]);
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastViewport items={toasts} onDismiss={dismissToast} />
      <DialogView request={dialog} onResolve={resolveDialog} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
