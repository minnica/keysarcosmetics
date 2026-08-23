"use client";

import { useEffect, useMemo, useState } from "react";

type RestMember = {
  id: number;
  name: string;
  restDay: string;
  restDay2: string;
};

type CalendarView = "weekly" | "fortnightly" | "monthly";

function dateKey(date: Date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

export default function CalendarRestSummary({
  dates,
  members,
  view,
}: {
  dates: Date[];
  members: RestMember[];
  view: CalendarView;
}) {
  const [expanded, setExpanded] = useState(view === "monthly");
  const today = dateKey(new Date());
  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  useEffect(() => {
    setExpanded(view === "monthly");
  }, [view, dates]);

  const visibleDates = useMemo(() => {
    if (view === "monthly" || expanded) return dates;
    const current = dates.find((date) => dateKey(date) === today);
    return current ? [current] : dates.slice(0, 1);
  }, [dates, expanded, today, view]);

  return (
    <section className="calendar-rest-summary">
      <div className="calendar-rest-head">
        <div>
          <p className="eyebrow">INFORMACIÓN DE DESCANSOS</p>
          <h2>
            {view === "monthly"
              ? "Resumen mensual de descansos"
              : expanded
                ? "Descansos del periodo completo"
                : "Descansos del día actual"}
          </h2>
        </div>
        {view !== "monthly" && (
          <button onClick={() => setExpanded((current) => !current)}>
            {expanded ? "MOSTRAR SOLO HOY" : "MOSTRAR SEMANA COMPLETA"}
          </button>
        )}
      </div>
      <div className="rest-summary-grid">
        {visibleDates.map((date) => {
          const day = dayNames[date.getDay()];
          const resting = members.filter(
            (member) =>
              member.restDay === day || member.restDay2 === day,
          );
          return (
            <article
              className={dateKey(date) === today ? "today" : ""}
              key={date.toISOString()}
            >
              {dateKey(date) === today && <b>HOY</b>}
              <time>
                {date.toLocaleDateString("es-MX", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </time>
              {resting.map((member) => (
                <span key={member.id}>{member.name}</span>
              ))}
              {!resting.length && <i>Sin descansos</i>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
