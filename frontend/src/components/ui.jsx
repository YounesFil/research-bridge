import { AlertCircle, Inbox } from "lucide-react";

export function Loading({ label = "Loading..." }) {
  return (
    <div className="state">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, label = "Something went wrong" }) {
  return (
    <div className="state">
      <AlertCircle size={26} color="var(--danger)" />
      <div>
        <div style={{ color: "var(--text)" }}>{label}</div>
        {error?.message && (
          <div className="faint" style={{ fontSize: 13 }}>
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", hint }) {
  return (
    <div className="state">
      <Icon size={26} />
      <div>
        <div style={{ color: "var(--text)" }}>{title}</div>
        {hint && (
          <div className="faint" style={{ fontSize: 13 }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

// Renders loading / error / empty / data states for a TanStack query.
export function QueryState({ query, children, isEmpty, empty, loadingLabel }) {
  if (query.isLoading) return <Loading label={loadingLabel} />;
  if (query.isError) return <ErrorState error={query.error} />;
  const data = query.data;
  if (isEmpty && isEmpty(data)) return empty || <EmptyState />;
  return children(data);
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="row gap-4 wrap" style={{ justifyContent: "space-between", marginBottom: 22 }}>
      <div className="stack gap-2">
        <h1 style={{ fontSize: 24 }}>{title}</h1>
        {subtitle && <p className="muted" style={{ maxWidth: 620 }}>{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
