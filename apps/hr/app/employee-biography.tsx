import {
  vacationBalance,
  type VacationModel,
} from "./vacation-models-panel";

type BiographyMember = {
  id: number;
  name: string;
  firstName: string | null;
  paternalSurname: string | null;
  maternalSurname: string | null;
  jobRole: string;
  branch: string;
  shift: string;
  restDay: string;
  restDay2: string;
  vacationModelId: number | null;
};

type RequestRow = {
  staffId: number;
  requestType: string;
  startDate: string;
  endDate: string;
  status: string;
};

type Assignment = {
  staffId: number;
  workDate: string;
  branch: string;
  shift: string;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EmployeeBiography({
  member,
  models,
  requests,
  assignments,
}: {
  member: BiographyMember;
  models: VacationModel[];
  requests: RequestRow[];
  assignments: Assignment[];
}) {
  const balance = vacationBalance(member, models, requests);
  const permissions = requests.filter(
    (request) =>
      request.staffId === member.id &&
      !request.requestType.toLowerCase().includes("vacaci"),
  );
  const authorizedPermissions = permissions.filter(
    (request) => request.status === "Autorizado",
  ).length;
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = dateKey(date);
    return {
      date,
      assignment: assignments.find(
        (assignment) =>
          assignment.staffId === member.id && assignment.workDate === key,
      ),
    };
  });
  const structuredName = [
    member.firstName,
    member.paternalSurname,
    member.maternalSurname,
  ]
    .filter(Boolean)
    .join(" ");
  const fullName = structuredName || member.name;

  return (
    <article className="employee-biography">
      <header>
        <div>
          <p className="eyebrow">FICHA BIOGRÁFICA LABORAL</p>
          <h2>{fullName}</h2>
          <span>
            {member.jobRole} · {member.branch}
          </span>
        </div>
        <strong>KEYSAR COSMETICS</strong>
      </header>
      <div className="biography-stats">
        <div>
          <span>VACACIONES DISPONIBLES</span>
          <b>{balance.remaining}</b>
          <small>
            {balance.used} utilizados de {balance.model?.totalDays || 0}
          </small>
        </div>
        <div>
          <span>PERMISOS REGISTRADOS</span>
          <b>{permissions.length}</b>
          <small>{authorizedPermissions} autorizados</small>
        </div>
        <div>
          <span>DÍAS DE DESCANSO</span>
          <b className="text-stat">{member.restDay}</b>
          <small>{member.restDay2 || "Sin segundo descanso"}</small>
        </div>
      </div>
      <div className="biography-schedule">
        <div className="biography-schedule-head">
          <h3>Horario semanal</h3>
          <span>Semana actual</span>
        </div>
        <div className="biography-week">
          {week.map(({ date, assignment }) => (
            <div key={date.toISOString()}>
              <time>
                {date.toLocaleDateString("es-MX", {
                  weekday: "short",
                  day: "numeric",
                })}
              </time>
              <b>{assignment?.shift || member.shift || "Sin asignar"}</b>
              <small>{assignment?.branch || member.branch}</small>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
