type Person = {
  id: number;
  name: string;
  branch: string;
};

type Vacation = {
  id: number;
  staffId: number;
  requestType: string;
  startDate: string;
  endDate: string;
  status: string;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export default function CalendarVacationSummary({
  dates,
  members,
  requests,
}: {
  dates: Date[];
  members: Person[];
  requests: Vacation[];
}) {
  if (!dates.length) return null;

  const periodStart = dateKey(dates[0]);
  const periodEnd = dateKey(dates[dates.length - 1]);
  const vacations = requests
    .filter(
      (request) =>
        request.status === "Autorizado" &&
        request.requestType.toLocaleLowerCase("es-MX").includes("vacaci") &&
        request.startDate <= periodEnd &&
        request.endDate >= periodStart,
    )
    .map((request) => ({
      request,
      member: members.find((member) => member.id === request.staffId),
    }))
    .filter(
      (entry): entry is { request: Vacation; member: Person } => !!entry.member,
    )
    .sort(
      (a, b) =>
        a.request.startDate.localeCompare(b.request.startDate) ||
        a.member.name.localeCompare(b.member.name, "es"),
    );

  return (
    <section className="calendar-vacation-summary">
      <div className="calendar-vacation-head">
        <div>
          <p className="eyebrow">VACACIONES AUTORIZADAS</p>
          <h2>Personal de vacaciones</h2>
        </div>
        <span>
          {formatDate(periodStart)} – {formatDate(periodEnd)}
        </span>
      </div>
      {vacations.length ? (
        <div className="calendar-vacation-grid">
          {vacations.map(({ request, member }) => (
            <article key={request.id}>
              <span className="vacation-person-mark">V</span>
              <div>
                <h3>{member.name}</h3>
                <p>{member.branch || "Sucursal sin asignar"}</p>
              </div>
              <time>
                {formatDate(request.startDate)} – {formatDate(request.endDate)}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p className="calendar-vacation-empty">
          No hay personal de vacaciones durante este periodo.
        </p>
      )}
    </section>
  );
}
