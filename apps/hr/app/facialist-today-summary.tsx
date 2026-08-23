"use client";

import { useState } from "react";

type Person = {
  id: number;
  name: string;
  jobRole: string;
};

type Assignment = {
  id: number;
  staffId: number;
  workDate: string;
  branch: string;
  shift: string;
};

type Absence = {
  staffId: number;
  startDate: string;
  endDate: string;
  requestType: string;
  status: string;
};

function currentDateKey() {
  const today = new Date();
  return (
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0")
  );
}

export default function FacialistTodaySummary({
  members,
  assignments,
  absences,
  branches,
}: {
  members: Person[];
  assignments: Assignment[];
  absences: Absence[];
  branches: string[];
}) {
  const [selectedDate, setSelectedDate] = useState(currentDateKey);
  const facialists = members.filter((member) =>
    member.jobRole.toLowerCase().includes("facialista"),
  );

  return (
    <section className="facialist-today">
      <div className="facialist-today-head">
        <div>
          <p className="eyebrow">CONSULTA POR FECHA Y SUCURSAL</p>
          <h2>Roles de facialistas por día</h2>
        </div>
        <label className="facialist-day-picker">
          ELEGIR DÍA
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
      </div>
      <div className="facialist-today-grid">
        {branches.map((branch) => {
          const rows = assignments
            .filter(
              (assignment) =>
                assignment.workDate === selectedDate &&
                assignment.branch === branch &&
                assignment.shift !== "Sin asignar" &&
                facialists.some(
                  (person) => person.id === assignment.staffId,
                ) &&
                !absences.some(
                  (item) =>
                    item.staffId === assignment.staffId &&
                    item.status === "Autorizado" &&
                    item.startDate <= selectedDate &&
                    item.endDate >= selectedDate,
                ),
            )
            .sort((a, b) => {
              const first =
                facialists.find((person) => person.id === a.staffId)?.name ||
                "";
              const second =
                facialists.find((person) => person.id === b.staffId)?.name ||
                "";
              return first.localeCompare(second, "es");
            });
          return (
            <article className="facialist-day-branch" key={branch}>
              <h3>{branch}</h3>
              {rows.map((assignment) => {
                const person = facialists.find(
                  (member) => member.id === assignment.staffId,
                );
                return person ? (
                  <div className="facialist-day-person" key={assignment.id}>
                    <span>F</span>
                    <div>
                      <b>{person.name}</b>
                      <small>{person.jobRole}</small>
                    </div>
                    <div>
                      <small>{assignment.shift}</small>
                    </div>
                  </div>
                ) : null;
              })}
              {!rows.length && <p>Sin facialistas programadas</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
