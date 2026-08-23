import {
  vacationBalance,
  type VacationModel,
} from "./vacation-models-panel";

type VacationMember = {
  id: number;
  name: string;
  jobRole: string;
  isActive: boolean;
  vacationModelId: number | null;
};

type VacationRequest = {
  staffId: number;
  requestType: string;
  startDate: string;
  endDate: string;
  status: string;
};

export default function VacationBalanceHistory({
  members,
  models,
  requests,
}: {
  members: VacationMember[];
  models: VacationModel[];
  requests: VacationRequest[];
}) {
  const rows = members
    .map((member) => ({
      member,
      balance: vacationBalance(member, models, requests),
    }))
    .sort((a, b) => {
      const aPriority = !a.balance.model
        ? 3
        : a.balance.remaining === 0
          ? 0
          : a.balance.remaining <= 2
            ? 1
            : 2;
      const bPriority = !b.balance.model
        ? 3
        : b.balance.remaining === 0
          ? 0
          : b.balance.remaining <= 2
            ? 1
            : 2;
      return aPriority - bPriority || a.member.name.localeCompare(b.member.name);
    });
  const exhausted = rows.filter(
    ({ balance }) => balance.model && balance.remaining === 0,
  );

  return (
    <section className="vacation-balance-history">
      <div className="vacation-balance-heading">
        <div>
          <p className="eyebrow">SALDO ACTUAL POR EMPLEADO</p>
          <h2>Historial de días disponibles</h2>
          <span>
            Consulta los días otorgados, utilizados y restantes de todo el
            equipo.
          </span>
        </div>
        <b>{members.length} empleados</b>
      </div>

      {exhausted.length > 0 && (
        <div className="vacation-balance-alert" role="alert">
          <strong>⚠ Vacaciones terminadas</strong>
          <span>
            {exhausted.map(({ member }) => member.name).join(", ")} ya no
            {exhausted.length === 1 ? " tiene" : " tienen"} días disponibles.
          </span>
        </div>
      )}

      <div className="vacation-balance-table">
        <div className="vacation-balance-table-head">
          <span>Empleado</span>
          <span>Modelo</span>
          <span>Otorgados</span>
          <span>Utilizados</span>
          <span>Restantes</span>
          <span>Estado</span>
        </div>
        {rows.map(({ member, balance }) => {
          const status = !balance.model
            ? "Sin modelo"
            : balance.remaining === 0
              ? "Saldo terminado"
              : balance.remaining <= 2
                ? "Saldo bajo"
                : "Disponible";
          const statusClass = !balance.model
            ? "unassigned"
            : balance.remaining === 0
              ? "exhausted"
              : balance.remaining <= 2
                ? "low"
                : "available";

          return (
            <article
              className={balance.remaining === 0 && balance.model ? "is-exhausted" : ""}
              key={member.id}
            >
              <div>
                <b>{member.name}</b>
                <small>
                  {member.jobRole} · {member.isActive ? "Activo" : "Inactivo"}
                </small>
              </div>
              <span>{balance.model?.name || "Sin asignar"}</span>
              <strong>{balance.model?.totalDays ?? "—"}</strong>
              <strong>{balance.model ? balance.used : "—"}</strong>
              <strong className={statusClass}>
                {balance.model ? balance.remaining : "—"}
              </strong>
              <i className={`vacation-balance-status ${statusClass}`}>
                {status}
              </i>
            </article>
          );
        })}
        {!rows.length && (
          <div className="empty">
            <h3>Sin empleados registrados</h3>
            <p>Los saldos de vacaciones aparecerán aquí.</p>
          </div>
        )}
      </div>
    </section>
  );
}
