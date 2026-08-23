const links = [
  ['inicio', '▦', 'Resumen'], ['unidades', '▤', 'Sucursales'], ['rentas', '⌂', 'Rentas'],
  ['servicios', '✦', 'Servicios'], ['pagos', '＄', 'Pagos'], ['finanzas', '▥', 'Estado financiero'],
  ['financiamientos', '◈', 'Financiamientos'], ['socios', '％', 'Socios'],
  ['aportaciones', '−', 'Aportaciones de socios'], ['proyecciones', '↗', 'Proyección de ventas'],
  ['accesos', '⚿', 'Usuarios y accesos'], ['reportes', '▥', 'Reportes'],
]

export default function Sidebar({ section, onNavigate, collapsed, setCollapsed, unitCount, onReset }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Ocultar menú lateral">
        {collapsed ? '›' : '‹'}
      </button>
      <div className="brand">
        <img src="/logo.png" alt="Logotipo de la empresa" />
        <div><strong>KEYSAR COSMETICS</strong><small>Usuario Master</small></div>
      </div>
      <nav aria-label="Navegación principal">
        {links.map(([id, icon, label]) => (
          <a key={id} href={`#${id}`} className={section === id ? 'active' : ''} onClick={(event) => {
            event.preventDefault(); onNavigate(id)
          }}>
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
            {id === 'unidades' && <b className="count">{unitCount}</b>}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="secondary wide" onClick={onReset}>↻ <span>Restablecer demo</span></button>
        <div className="profile"><i>ER</i><span><strong>Emmanuel Rangel</strong><small>Master</small></span></div>
      </div>
    </aside>
  )
}
