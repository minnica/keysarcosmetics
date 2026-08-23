import { monthLabel, periodShift } from '../utils.js'

export default function Topbar({ period, setPeriod }) {
  return (
    <div className="topbar no-print">
      <button aria-label="Mes anterior" onClick={() => setPeriod(periodShift(period, -1))}>‹</button>
      <label>
        <span>Periodo consultado</span>
        <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
      </label>
      <button aria-label="Mes siguiente" onClick={() => setPeriod(periodShift(period, 1))}>›</button>
      <em>{monthLabel(period)}</em>
    </div>
  )
}
