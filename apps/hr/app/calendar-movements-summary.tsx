type Person = {
  id: number;
  name: string;
  jobRole: string;
  branch: string;
};

type Assignment = {
  id: number;
  staffId: number;
  workDate: string;
  branch: string;
  shift: string;
};

type Movement = {
  id: number;
  staffId: number;
  requestType: string;
  startDate: string;
  endDate: string;
  status: string;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isSalesOrFacialist(role: string) {
  const normalized = role.toLocaleLowerCase("es-MX");
  return normalized.includes("vended") || normalized.includes("facialista");
}

export default function CalendarMovementsSummary({
  dates,
  members,
  assignments,
  movements,
}: {
  dates: Date[];
  members: Person[];
  assignments: Assignment[];
  movements: Movement[];
}) {
  if (!dates.length) return null;
  const periodStart = dateKey(dates[0]);
  const periodEnd = dateKey(dates[dates.length - 1]);
  const entries = movements
    .filter(
      (movement) =>
        movement.status === "Autorizado" &&
        movement.startDate <= periodEnd &&
        movement.endDate >= periodStart,
    )
    .map((movement) => {
      const member = members.find((person) => person.id === movement.staffId);
      const affectedAssignments = assignments
        .filter(
          (assignment) =>
            assignment.staffId === movement.staffId &&
            assignment.shift !== "Sin asignar" &&
            assignment.workDate >= periodStart &&
            assignment.workDate <= periodEnd &&
            assignment.workDate >= movement.startDate &&
            assignment.workDate <= movement.endDate,
        )
        .sort((a, b) => a.workDate.localeCompare(b.workDate));
      return { movement, member, affectedAssignments };
    })
    .filter(
      (
        entry,
      ): entry is {
        movement: Movement;
        member: Person;
        affectedAssignments: Assignment[];
      } =>
        Boolean(
          entry.member &&
            isSalesOrFacialist(entry.member.jobRole) &&
            entry.affectedAssignments.length,
        ),
    )
    .sort(
      (a, b) =>
        a.movement.startDate.localeCompare(b.movement.startDate) ||
        a.member.name.localeCompare(b.member.name, "es"),
    );

  return (
    <section className="calendar-movements-summary">
      <div className="calendar-movements-head">
        <div>
          <p className="eyebrow">MOVIMIENTOS AUTORIZADOS</p>
          <h2>Personal retirado del calendario</h2>
          <span>
            Permisos, vacaciones y movimientos que impiden la asistencia en el
            periodo mostrado.
          </span>
        </div>
        <b>{entries.length}</b>
      </div>
      {entries.length ? (
        <div className="calendar-movements-list">
          {entries.map(({ movement, member, affectedAssignments }) => (
            <article key={movement.id}>
              <span className="calendar-movement-mark">
                {movement.requestType.trim().charAt(0).toUpperCase() || "M"}
              </span>
              <div className="calendar-movement-person">
                <h3>{member.name}</h3>
                <p>
                  {member.jobRole} · {member.branch || "Sucursal sin asignar"}
                </p>
              </div>
              <strong>{movement.requestType}</strong>
              <time>
                {formatDate(movement.startDate)} – {formatDate(movement.endDate)}
              </time>
              <div className="calendar-movement-days">
                {affectedAssignments.map((assignment) => (
                  <span key={assignment.id}>
                    <b>{formatDate(assignment.workDate)}</b>
                    {assignment.branch} · {assignment.shift}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="calendar-movements-empty">
          No hay movimientos autorizados que afecten al personal programado en
          este periodo.
        </p>
      )}
    </section>
  );
}
