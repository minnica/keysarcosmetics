type Person = { id: number; name: string; jobRole: string };
type Assignment = {
  id: number;
  staffId: number;
  workDate: string;
  branch: string;
  shift: string;
};
type Request = {
  id: number;
  staffId: number;
  startDate: string;
  endDate: string;
  requestType: string;
  status: string;
};

export default function FacialistCoverageSummary({
  dates,
  members,
  assignments,
  branches,
  requests,
}: {
  dates: Date[];
  members: Person[];
  assignments: Assignment[];
  branches: string[];
  requests: Request[];
}) {
  const keys = dates.map(
    (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  );
  const facialists = members.filter((member) =>
    member.jobRole.toLowerCase().includes("facialista"),
  );
  function absence(personId: number, date: string) {
    return requests.find(
      (request) =>
        request.staffId === personId &&
        request.status === "Autorizado" &&
        request.startDate <= date &&
        request.endDate >= date,
    );
  }
  return (
    <section className="facialist-coverage">
      <div className="facialist-coverage-head">
        <div>
          <p className="eyebrow">COBERTURA DEL PERIODO</p>
          <h2>Facialistas por sucursal</h2>
        </div>
        <span>Conteo de asistencias durante el periodo mostrado.</span>
      </div>
      <div className="facialist-coverage-grid">
        {branches.map((branch) => {
          const rows = assignments
            .filter(
              (item) =>
                keys.includes(item.workDate) &&
                item.branch === branch &&
                item.shift !== "Sin asignar" &&
                facialists.some((person) => person.id === item.staffId),
            )
            .sort((a, b) => a.workDate.localeCompare(b.workDate));
          const attendance = facialists
            .map((person) => ({
              person,
              count: rows.filter(
                (item) =>
                  item.staffId === person.id &&
                  !absence(person.id, item.workDate),
              ).length,
            }))
            .filter((item) => item.count > 0)
            .sort((a, b) => a.person.name.localeCompare(b.person.name, "es"));
          return (
            <article key={branch}>
              <h3>{branch}</h3>
              {attendance.map(({ person, count }) => (
                <div className="coverage-count-person" key={person.id}>
                  <span>{person.name}</span>
                  <b>
                    {count} {count === 1 ? "asistencia" : "asistencias"}
                  </b>
                </div>
              ))}
              {!attendance.length && <p>Sin asistencias programadas</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
