"use client";

import { useState } from "react";

export type VacationModel = { id: number; name: string; periodType: string; totalDays: number; createdAt: string };
type VacationMember = { id: number; name: string; vacationModelId: number | null };
type VacationRequest = { staffId: number; requestType: string; startDate: string; endDate: string; status: string };

function days(startDate: string, endDate: string) { return Math.max(1, Math.round((new Date(`${endDate}T12:00:00`).getTime() - new Date(`${startDate}T12:00:00`).getTime()) / 86400000) + 1); }

export function vacationBalance(member: VacationMember, models: VacationModel[], requests: VacationRequest[]) {
  const model = models.find(item => item.id === member.vacationModelId), used = requests.filter(item => item.staffId === member.id && item.requestType.toLowerCase().includes("vacaci") && item.status === "Autorizado").reduce((total, item) => total + days(item.startDate, item.endDate), 0);
  return { model, used, remaining: Math.max(0, (model?.totalDays || 0) - used) };
}

export default function VacationModelsPanel({ models, members, requests, master, onSaved }: { models: VacationModel[]; members: VacationMember[]; requests: VacationRequest[]; master: boolean; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(""), [periodType, setPeriodType] = useState("periodo"), [totalDays, setTotalDays] = useState(7), [message, setMessage] = useState("");
  async function act(payload: Record<string, unknown>) { const response = await fetch("/api/app", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }), data = await response.json(); if (!response.ok) { setMessage(data.error || "No fue posible guardar."); return false; } await onSaved(); return true; }
  async function create() { if (await act({ action: "vacation_model_create", name, periodType, totalDays })) { setName(""); setMessage("Modelo de vacaciones creado."); } }
  return <section className="vacation-models">
    <div className="vacation-model-head"><div><p className="eyebrow">CONTROL DE SALDOS</p><h2>Modelos de vacaciones</h2><span>Asigna un modelo obligatorio y consulta los días disponibles.</span></div></div>
    {master && <div className="vacation-model-create"><input value={name} onChange={event => setName(event.target.value)} placeholder="Nombre del modelo"/><select value={periodType} onChange={event => setPeriodType(event.target.value)}><option value="periodo">Por periodo</option><option value="semanas">Por semanas</option><option value="mes">Mes completo</option></select><label>Días totales<input type="number" min={1} max={365} value={totalDays} onChange={event => setTotalDays(Number(event.target.value))}/></label><button onClick={create}>CREAR MODELO</button></div>}
    {message && <p className="policy-message">{message}</p>}
    <div className="vacation-model-grid">{models.map(model => <article key={model.id}><div><small>{model.periodType.toUpperCase()}</small><h3>{model.name}</h3><b>{model.totalDays} DÍAS</b></div><span>{members.filter(member => member.vacationModelId === model.id).length} empleados</span>{master && <button onClick={() => act({ action: "vacation_model_delete", id: model.id })}>Borrar</button>}</article>)}</div>
    <div className="vacation-assignment-list"><div className="vacation-assignment-head"><span>Empleado</span><span>Modelo asignado</span><span>Utilizados</span><span>Disponibles</span></div>{members.map(member => { const balance = vacationBalance(member, models, requests); return <article key={member.id}><b>{member.name}</b><select disabled={!master} value={member.vacationModelId || 0} onChange={event => act({ action: "vacation_model_assign", staffId: member.id, vacationModelId: Number(event.target.value) })}><option value={0}>Sin modelo</option>{models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select><span>{balance.used} días</span><strong>{balance.remaining} días</strong></article>})}</div>
  </section>;
}
