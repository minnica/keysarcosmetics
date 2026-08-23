"use client";

import { useEffect, useMemo, useState } from "react";
import {
  vacationBalance,
  type VacationModel,
} from "./vacation-models-panel";

type VacationMember = {
  id: number;
  name: string;
  vacationModelId: number | null;
  restDay: string;
  restDay2: string;
  restType: string;
  restStartDate: string | null;
  restEndDate: string | null;
};

type VacationRequest = {
  staffId: number;
  requestType: string;
  startDate: string;
  endDate: string;
  status: string;
};

const dayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isRestDay(member: VacationMember, date: string) {
  const day = dayNames[new Date(`${date}T12:00:00`).getDay()];
  const matches = day === member.restDay || day === member.restDay2;
  if (!matches) return false;
  if (member.restType !== "Temporal") return true;
  return Boolean(
    member.restStartDate &&
      member.restEndDate &&
      date >= member.restStartDate &&
      date <= member.restEndDate,
  );
}

export default function CustomVacationPanel({
  members,
  models,
  requests,
  canEdit,
  onSaved,
}: {
  members: VacationMember[];
  models: VacationModel[];
  requests: VacationRequest[];
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState(0);
  const [date, setDate] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!staffId && members[0]) setStaffId(members[0].id);
  }, [members, staffId]);

  const member = members.find((item) => item.id === staffId) || members[0];
  const balance = member
    ? vacationBalance(member, models, requests)
    : { model: undefined, used: 0, remaining: 0 };
  const chargeableDates = useMemo(
    () =>
      member
        ? selectedDates.filter((selected) => !isRestDay(member, selected))
        : [],
    [member, selectedDates],
  );

  function addDate() {
    if (!date) return;
    setSelectedDates((current) =>
      [...new Set([...current, date])].sort((a, b) => a.localeCompare(b)),
    );
    setDate("");
    setMessage("");
  }

  async function save() {
    if (!member || !selectedDates.length) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/app", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "custom_vacation_create",
          staffId: member.id,
          dates: selectedDates,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No fue posible registrar las vacaciones");
      const excluded = Number(data.excludedRestDays || 0);
      setMessage(
        `${data.createdCount} día(s) de vacaciones guardados.${excluded ? ` ${excluded} descanso(s) no se descontaron.` : ""}`,
      );
      setSelectedDates([]);
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible registrar las vacaciones",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="custom-vacation-shell">
      <div className="custom-vacation-heading">
        <div>
          <p className="eyebrow">ASIGNACIÓN ADMINISTRATIVA</p>
          <h2>Vacaciones personalizadas</h2>
          <span>Elige uno o varios días. Los descansos no se descuentan.</span>
        </div>
        {canEdit && (
          <button onClick={() => setOpen((current) => !current)}>
            {open ? "CERRAR" : "＋ VACACIONES PERSONALIZADAS"}
          </button>
        )}
      </div>
      {open && canEdit && (
        <div className="custom-vacation-form">
          <label>
            Empleado
            <select
              value={member?.id || 0}
              onChange={(event) => {
                setStaffId(Number(event.target.value));
                setSelectedDates([]);
                setMessage("");
              }}
            >
              {members.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="custom-vacation-balance">
            <span>MODELO</span>
            <b>{balance.model?.name || "Sin modelo asignado"}</b>
            <strong>{balance.remaining} días disponibles</strong>
          </div>
          <label>
            Elegir día
            <div className="custom-date-add">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <button disabled={!date} onClick={addDate}>
                Agregar día
              </button>
            </div>
          </label>
          <div className="custom-date-list">
            {selectedDates.map((selected) => {
              const rest = member ? isRestDay(member, selected) : false;
              return (
                <span className={rest ? "rest-date" : ""} key={selected}>
                  <b>{formatDate(selected)}</b>
                  <small>{rest ? "Descanso · no se descuenta" : "Vacaciones"}</small>
                  <button
                    aria-label={`Quitar ${selected}`}
                    onClick={() =>
                      setSelectedDates((current) =>
                        current.filter((item) => item !== selected),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {!selectedDates.length && <i>Agrega los días que deseas registrar.</i>}
          </div>
          <div className="custom-vacation-actions">
            <p>
              Se descontarán <b>{chargeableDates.length}</b> día(s) del saldo.
            </p>
            <button
              disabled={!chargeableDates.length || saving || !balance.model}
              onClick={save}
            >
              {saving ? "GUARDANDO…" : "GUARDAR VACACIONES"}
            </button>
          </div>
          {message && <p className="custom-vacation-message">{message}</p>}
        </div>
      )}
    </section>
  );
}
