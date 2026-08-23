"use client";

import { useMemo, useState } from "react";

export type BirthdayEntry = {
  id: number;
  name: string;
  birthday: string;
  branch: string;
};

function nextBirthday(entry: BirthdayEntry) {
  const [month, day] = entry.birthday.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let date = new Date(today.getFullYear(), month - 1, day);
  if (date < today) date = new Date(today.getFullYear() + 1, month - 1, day);
  return date;
}

function daysUntil(entry: BirthdayEntry) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (nextBirthday(entry).getTime() - today.getTime()) / 86400000,
  );
}

export default function BirthdaysPanel({
  entries,
  companyName,
}: {
  entries: BirthdayEntry[];
  companyName: string;
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [alertOpen, setAlertOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      !sessionStorage.getItem(
        `birthday-alert-${new Date().toISOString().slice(0, 10)}`,
      ),
  );
  const sorted = useMemo(
    () => [...entries].sort((a, b) => daysUntil(a) - daysUntil(b)),
    [entries],
  );
  const week = sorted.filter((entry) => daysUntil(entry) <= 7);
  const visible =
    view === "week"
      ? week
      : sorted.filter((entry) => Number(entry.birthday.slice(0, 2)) === month);

  function closeAlert() {
    sessionStorage.setItem(
      `birthday-alert-${new Date().toISOString().slice(0, 10)}`,
      "1",
    );
    setAlertOpen(false);
  }

  function congratulate(entry: BirthdayEntry) {
    const firstName = entry.name.split(" ")[0];
    const message = `¡Feliz cumpleaños, ${firstName}! En ${companyName} celebramos tu talento, dedicación y todo lo que aportas al equipo. Deseamos que tengas un día extraordinario. ✨`;
    if (navigator.share)
      void navigator.share({
        title: `Felicitación para ${firstName}`,
        text: message,
      });
    else
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
  }

  return (
    <section className="birthday-shell">
      <div className="birthday-heading">
        <div>
          <p className="eyebrow">CELEBRAMOS A NUESTRO EQUIPO</p>
          <h2>Recordatorios de cumpleaños</h2>
          <p>Consulta las celebraciones de la semana o de cualquier mes.</p>
        </div>
        <span>✦ {entries.length} registrados</span>
      </div>
      <div className="birthday-controls">
        <button
          className={view === "week" ? "active" : ""}
          onClick={() => setView("week")}
        >
          Esta semana
        </button>
        <button
          className={view === "month" ? "active" : ""}
          onClick={() => setView("month")}
        >
          Por mes
        </button>
        {view === "month" && (
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {[
              "Enero",
              "Febrero",
              "Marzo",
              "Abril",
              "Mayo",
              "Junio",
              "Julio",
              "Agosto",
              "Septiembre",
              "Octubre",
              "Noviembre",
              "Diciembre",
            ].map((name, index) => (
              <option value={index + 1} key={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="birthday-list">
        {visible.map((entry) => {
          const remaining = daysUntil(entry);
          return (
            <article key={entry.id}>
              <time>
                <b>{entry.birthday.slice(3)}</b>
                <span>
                  {new Date(
                    2000,
                    Number(entry.birthday.slice(0, 2)) - 1,
                    1,
                  ).toLocaleDateString("es-MX", { month: "short" })}
                </span>
              </time>
              <div>
                <h3>{entry.name}</h3>
                <p>
                  {entry.branch} ·{" "}
                  {remaining === 0
                    ? "Hoy"
                    : remaining === 1
                      ? "Mañana"
                      : `En ${remaining} días`}
                </p>
              </div>
              <button onClick={() => congratulate(entry)}>
                Enviar felicitación
              </button>
            </article>
          );
        })}
        {!visible.length && (
          <div className="birthday-empty">
            <span>✦</span>
            <h3>Sin cumpleaños en este periodo</h3>
            <p>
              Selecciona otro mes o registra la fecha desde el perfil del
              usuario.
            </p>
          </div>
        )}
      </div>
      {alertOpen && week.length > 0 && (
        <div
          className="birthday-alert-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Próximos cumpleaños"
        >
          <div className="birthday-alert">
            <button className="close" onClick={closeAlert}>
              ×
            </button>
            <span className="birthday-seal">✦</span>
            <p className="eyebrow">RECORDATORIO DE LA EMPRESA</p>
            <h2>
              {week[0].name.split(" ")[0]}{" "}
              {daysUntil(week[0]) === 0
                ? "cumple años hoy"
                : `cumple años en ${daysUntil(week[0])} días`}
            </h2>
            <p>Prepara una felicitación especial en nombre de {companyName}.</p>
            <button
              className="gold"
              onClick={() => {
                congratulate(week[0]);
                closeAlert();
              }}
            >
              MANDAR FELICITACIÓN
            </button>
            <button className="later" onClick={closeAlert}>
              Recordar mañana
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
