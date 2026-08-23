export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>
      {actions && <div className="header-actions no-print">{actions}</div>}
    </header>
  )
}

export function MetricCard({ icon, label, value, detail, tone = 'purple' }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span className="metric-icon">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

export function Empty({ children }) {
  return <div className="empty"><span>◇</span><p>{children}</p></div>
}

export function Modal({ title, description, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        <h2>{title}</h2>{description && <p>{description}</p>}{children}
      </section>
    </div>
  )
}

export function FormActions({ onCancel, submitLabel = 'Guardar' }) {
  return <div className="form-actions"><button type="button" className="secondary" onClick={onCancel}>Cancelar</button><button type="submit">{submitLabel}</button></div>
}

export function Card({ title, subtitle, actions, children, className = '' }) {
  return <section className={`panel ${className}`}><div className="panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{actions}</div>{children}</section>
}
