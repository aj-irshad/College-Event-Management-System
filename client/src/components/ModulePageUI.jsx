import "./modulePageUI.css";

export const PageHeader = ({ title, description, actionLabel, actionIcon, onAction }) => (
  <header className="ems-page-header">
    <div className="ems-page-header-copy">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actionLabel && onAction && (
      <button type="button" className="ems-page-header-action" onClick={onAction}>
        {actionIcon}
        {actionLabel}
      </button>
    )}
  </header>
);

export const EmptyState = ({ icon: Icon, title, description, actionLabel, actionIcon, onAction }) => (
  <section className="ems-empty-state" aria-live="polite">
    <div className="ems-empty-state-icon" aria-hidden="true">
      {Icon && <Icon size={25} strokeWidth={1.8} />}
    </div>
    <h2>{title}</h2>
    <p>{description}</p>
    {actionLabel && onAction && (
      <button type="button" className="ems-empty-state-action" onClick={onAction}>
        {actionIcon}
        {actionLabel}
      </button>
    )}
  </section>
);
