const rules = [
  'Diseña la experiencia desde cero.',
  'Usa solamente datos ficticios en memoria.',
  'No conectes API, autenticación ni base de datos.',
]

export default function PrototypeHomePage() {
  return (
    <main className="prototype-canvas">
      <section className="prototype-intro" aria-labelledby="prototype-title">
        <div className="prototype-mark" aria-hidden="true">
          LK
        </div>

        <p className="prototype-kicker">Keysar Cosmetics · Nómina</p>
        <h1 id="prototype-title">Lienzo de diseño</h1>
        <p className="prototype-summary">
          El frontend anterior fue retirado únicamente de esta rama. Este espacio está listo
          para definir los procesos, la navegación y la interfaz sin heredar el diseño anterior.
        </p>

        <ul className="prototype-rules" aria-label="Reglas del prototipo">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        <p className="prototype-next-step">
          Antes de comenzar, lee <code>apps/payroll/PROTOTYPE_BRIEF.md</code>.
        </p>
      </section>
    </main>
  )
}
