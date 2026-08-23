"use client";

import { useEffect, useMemo, useState } from "react";

type Facialist = {
  id: number;
  name: string;
  branch: string;
  shift: string;
  isActive: boolean;
};
type Assignment = {
  id: number;
  staffId: number;
  workDate: string;
  branch: string;
  shift: string;
};
type Draft = { branch: string; shift: string };
type ViewMode = "daily" | "general" | "person";

function dateKey(date: Date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function mondayFor(date = new Date()) {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export default function FacialistSchedulePanel({
  facialists,
  assignments,
  branches,
  shifts,
  canEdit,
  privateView,
  onSaved,
}: {
  facialists: Facialist[];
  assignments: Assignment[];
  branches: string[];
  shifts: string[];
  canEdit: boolean;
  privateView: boolean;
  onSaved: () => Promise<void>;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(
    privateView ? "person" : "general",
  );
  const [weekStart, setWeekStart] = useState(() => mondayFor());
  const [selectedFacialistId, setSelectedFacialistId] = useState(0);
  const active = useMemo(
    () =>
      facialists
        .filter((person) => person.isActive)
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [facialists],
  );
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        return day;
      }),
    [weekStart],
  );
  const today = dateKey(new Date());

  useEffect(() => {
    if (
      active.length &&
      !active.some((person) => person.id === selectedFacialistId)
    )
      setSelectedFacialistId(active[0].id);
  }, [active, selectedFacialistId]);

  function savedFor(id: number, workDate = date) {
    return assignments.find(
      (item) => item.staffId === id && item.workDate === workDate,
    );
  }
  function valueFor(person: Facialist) {
    const saved = savedFor(person.id);
    return (
      drafts[person.id] || {
        branch: saved?.branch || person.branch || branches[0] || "Sin asignar",
        shift: saved?.shift || person.shift || "Sin asignar",
      }
    );
  }
  function update(person: Facialist, key: keyof Draft, value: string) {
    setDrafts((current) => ({
      ...current,
      [person.id]: { ...valueFor(person), ...current[person.id], [key]: value },
    }));
  }

  async function save() {
    const pending = Object.entries(drafts);
    if (!pending.length) return;
    setSaving(true);
    setMessage("");
    for (const [staffId, draft] of pending) {
      const response = await fetch("/api/app", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "assignment_set",
          staffId: Number(staffId),
          workDate: date,
          branch: draft.branch,
          shift: draft.shift,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "No fue posible guardar el horario");
        setSaving(false);
        return;
      }
    }
    setDrafts({});
    setMessage("Horarios guardados para " + pending.length + " facialistas.");
    await onSaved();
    setSaving(false);
  }

  const selectedFacialist =
    active.find((person) => person.id === selectedFacialistId) || active[0];

  return (
    <section className="facialist-panel">
      <header>
        <div>
          <p className="eyebrow">COBERTURA DE CABINAS</p>
          <h2>Horarios de facialistas</h2>
          <span>
            {privateView
              ? "Tu acceso muestra únicamente tu horario personal."
              : "Consulta la semana general o selecciona una facialista."}
          </span>
        </div>
        {viewMode === "daily" ? (
          <label>
            FECHA
            <input
              type="date"
              value={date}
              onChange={(event) => {
                if (
                  !Object.keys(drafts).length ||
                  window.confirm("¿Descartar los cambios sin guardar?")
                ) {
                  setDrafts({});
                  setDate(event.target.value);
                }
              }}
            />
          </label>
        ) : (
          <div className="facialist-week-nav">
            <button
              onClick={() =>
                setWeekStart(
                  new Date(
                    weekStart.getFullYear(),
                    weekStart.getMonth(),
                    weekStart.getDate() - 7,
                  ),
                )
              }
            >
              ←
            </button>
            <span>
              {week[0].toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })}{" "}
              –{" "}
              {week[6].toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <button
              onClick={() =>
                setWeekStart(
                  new Date(
                    weekStart.getFullYear(),
                    weekStart.getMonth(),
                    weekStart.getDate() + 7,
                  ),
                )
              }
            >
              →
            </button>
          </div>
        )}
      </header>
      <div className="facialist-view-options">
        {canEdit && (
          <button
            className={viewMode === "daily" ? "active" : ""}
            onClick={() => setViewMode("daily")}
          >
            Programación diaria
          </button>
        )}
        {!privateView && (
          <button
            className={viewMode === "general" ? "active" : ""}
            onClick={() => setViewMode("general")}
          >
            Horario semanal general
          </button>
        )}
        <button
          className={viewMode === "person" ? "active" : ""}
          onClick={() => setViewMode("person")}
        >
          Horario semanal por facialista
        </button>
      </div>

      {viewMode === "daily" && (
        <div className="facialist-table">
          <div className="facialist-row heading">
            <span>Facialista</span>
            <span>Sucursal que cubrirá</span>
            <span>Turno</span>
            <span>Estado</span>
          </div>
          {active.map((person) => {
            const value = valueFor(person);
            return (
              <div
                className={
                  "facialist-row " + (drafts[person.id] ? "pending" : "")
                }
                key={person.id}
              >
                <strong>{person.name}</strong>
                <select
                  disabled={!canEdit}
                  value={value.branch}
                  onChange={(event) =>
                    update(person, "branch", event.target.value)
                  }
                >
                  {branches.map((branch) => (
                    <option key={branch}>{branch}</option>
                  ))}
                </select>
                <select
                  disabled={!canEdit}
                  value={value.shift}
                  onChange={(event) =>
                    update(person, "shift", event.target.value)
                  }
                >
                  <option>Sin asignar</option>
                  {shifts.map((shift) => (
                    <option key={shift}>{shift}</option>
                  ))}
                </select>
                <i>
                  {drafts[person.id]
                    ? "CAMBIO PENDIENTE"
                    : savedFor(person.id)
                      ? "PROGRAMADO"
                      : "SIN CAPTURA"}
                </i>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "general" && !privateView && (
        <div className="facialist-weekly-general">
          <div className="facialist-weekly-row heading">
            <strong>Facialista</strong>
            {week.map((day) => (
              <span
                className={dateKey(day) === today ? "today" : ""}
                key={dateKey(day)}
              >
                {day.toLocaleDateString("es-MX", { weekday: "short" })}
                <b>{day.getDate()}</b>
              </span>
            ))}
          </div>
          {active.map((person) => (
            <div className="facialist-weekly-row" key={person.id}>
              <strong>{person.name}</strong>
              {week.map((day) => {
                const workDate = dateKey(day);
                const assignment = savedFor(person.id, workDate);
                return (
                  <div
                    className={workDate === today ? "today" : ""}
                    key={workDate}
                  >
                    <b>{assignment?.branch || "Sin asignar"}</b>
                    <small>{assignment?.shift || "Sin horario"}</small>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {viewMode === "person" && (
        <div className="facialist-person-week">
          {!privateView && (
            <label>
              FACIALISTA
              <select
                value={selectedFacialist?.id || 0}
                onChange={(event) =>
                  setSelectedFacialistId(Number(event.target.value))
                }
              >
                {active.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedFacialist && (
            <>
              <div className="facialist-person-title">
                <span>HORARIO PERSONAL</span>
                <h3>{selectedFacialist.name}</h3>
              </div>
              <div className="facialist-person-days">
                {week.map((day) => {
                  const workDate = dateKey(day);
                  const assignment = savedFor(selectedFacialist.id, workDate);
                  return (
                    <article
                      className={workDate === today ? "today" : ""}
                      key={workDate}
                    >
                      <time>
                        {day.toLocaleDateString("es-MX", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </time>
                      {workDate === today && <i>HOY</i>}
                      <h4>{assignment?.branch || "Sin asignar"}</h4>
                      <p>{assignment?.shift || "Sin horario capturado"}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {!active.length && (
        <div className="facialist-empty">
          <h3>Sin facialistas activas</h3>
          <p>Asigna el puesto Facialista desde el perfil del empleado.</p>
        </div>
      )}
      {message && <p className="facialist-message">{message}</p>}
      {canEdit && viewMode === "daily" && (
        <footer>
          <span>{Object.keys(drafts).length} cambios pendientes</span>
          <button
            disabled={!Object.keys(drafts).length || saving}
            onClick={save}
          >
            {saving ? "GUARDANDO…" : "GUARDAR HORARIOS"}
          </button>
        </footer>
      )}
    </section>
  );
}
