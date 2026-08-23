import React from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Units from './pages/Units.jsx'
import Rents from './pages/Rents.jsx'
import Services from './pages/Services.jsx'
import Payments from './pages/Payments.jsx'
import Financials from './pages/Financials.jsx'
import Financings from './pages/Financings.jsx'
import Partners from './pages/Partners.jsx'
import Contributions from './pages/Contributions.jsx'
import Projections from './pages/Projections.jsx'
import Access from './pages/Access.jsx'
import Reports from './pages/Reports.jsx'
import { seed } from './data/seed.js'
import { useStoredState } from './utils.js'

const validSections = new Set(['inicio', 'unidades', 'rentas', 'servicios', 'pagos', 'finanzas', 'financiamientos', 'socios', 'aportaciones', 'proyecciones', 'accesos', 'reportes'])

export default function App() {
  const initialHash = window.location.hash.slice(1)
  const [section, setSection] = React.useState(validSections.has(initialHash) ? initialHash : 'inicio')
  const [period, setPeriod] = React.useState('2026-08')
  const [collapsed, setCollapsed] = useStoredState('vam-menu-collapsed', false)
  const [data, setData] = useStoredState('vam-control-data-v1', seed)
  const [installPrompt, setInstallPrompt] = React.useState(null)

  React.useEffect(() => {
    const onHash = () => { const value = window.location.hash.slice(1); if (validSections.has(value)) setSection(value) }
    const onInstall = (event) => { event.preventDefault(); setInstallPrompt(event) }
    window.addEventListener('hashchange', onHash); window.addEventListener('beforeinstallprompt', onInstall)
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('beforeinstallprompt', onInstall) }
  }, [])

  const navigate = (value) => { setSection(value); window.history.replaceState(null, '', `#${value}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const setField = (field) => (value) => setData((current) => ({ ...current, [field]: typeof value === 'function' ? value(current[field]) : value }))
  const reset = () => { if (window.confirm('¿Restablecer todos los datos locales de la demostración?')) { localStorage.removeItem('vam-control-data-v1'); setData(structuredClone(seed)); navigate('inicio') } }
  const install = async () => { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null) } else alert('La instalación está disponible al compilar el proyecto y servirlo por HTTPS o localhost.') }

  const pages = {
    inicio: <Dashboard data={data} period={period} navigate={navigate} />,
    unidades: <Units units={data.units} setUnits={setField('units')} />,
    rentas: <Rents data={data} period={period} setRents={setField('rents')} />,
    servicios: <Services services={data.services} setServices={setField('services')} />,
    pagos: <Payments data={data} period={period} setPayments={setField('payments')} />,
    finanzas: <Financials data={data} period={period} setFinancials={setField('financials')} />,
    financiamientos: <Financings data={data} setFinancings={setField('financings')} />,
    socios: <Partners data={data} setPartners={setField('partners')} />,
    aportaciones: <Contributions data={data} period={period} setContributions={setField('contributions')} />,
    proyecciones: <Projections data={data} />,
    accesos: <Access data={data} setAccessUsers={setField('accessUsers')} />,
    reportes: <Reports data={data} period={period} />,
  }

  return <div className={`app ${collapsed ? 'menu-collapsed' : ''}`}>
    <Sidebar section={section} onNavigate={navigate} collapsed={collapsed} setCollapsed={setCollapsed} unitCount={data.units.length} onReset={reset} />
    <main className="app-main">
      <Topbar period={period} setPeriod={setPeriod} />
      <div className="content">{pages[section]}</div>
    </main>
    <div className="floating-actions no-print"><button className="install" onClick={install}>▣ <span>Instalar app</span></button><button className="help" onClick={() => alert('Consulta README.md para instalación, datos y próximos pasos.')}>? <span>Ayuda</span></button></div>
  </div>
}
