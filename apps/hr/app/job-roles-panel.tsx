"use client";

import { useState } from "react";
import {
  parsePermissions,
  permissionModules,
} from "./access-permissions";

export type JobRole = {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
};
type MemberRole = {
  id: number;
  name: string;
  username: string | null;
  jobRole: string;
  isActive: boolean;
  isAdmin: boolean;
  permissions: string;
};

export default function JobRolesPanel({
  roles,
  members,
  canEdit,
  canManagePermissions,
  onManagePermissions,
  onSaved,
}: {
  roles: JobRole[];
  members: MemberRole[];
  canEdit: boolean;
  canManagePermissions: boolean;
  onManagePermissions: () => void;
  onSaved: () => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(0);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");

  async function request(payload: Record<string, unknown>) {
    const response = await fetch("/api/app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "No fue posible guardar el puesto");
    return data;
  }

  async function create() {
    try {
      await request({ action: "job_role_create", name: newName });
      setNewName("");
      setMessage("Puesto creado y disponible en todos los módulos.");
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible crear el puesto",
      );
    }
  }

  async function save(role: JobRole) {
    try {
      await request({
        action: "job_role_update",
        id: role.id,
        name: editingName,
        active: role.active,
      });
      setEditingId(0);
      setMessage(
        "Puesto actualizado en perfiles, calendarios, permisos y reportes.",
      );
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el puesto",
      );
    }
  }

  async function toggle(role: JobRole) {
    try {
      await request({
        action: "job_role_update",
        id: role.id,
        name: role.name,
        active: !role.active,
      });
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cambiar el estado",
      );
    }
  }

  async function remove(role: JobRole) {
    if (
      !window.confirm(
        `¿Borrar el puesto ${role.name}? Los empleados asignados pasarán a “Sin puesto”.`,
      )
    )
      return;
    try {
      await request({ action: "job_role_delete", id: role.id });
      setMessage(
        "Puesto eliminado. Los perfiles afectados ahora aparecen como “Sin puesto”.",
      );
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible borrar el puesto",
      );
    }
  }

  return (
    <section className="catalog-shell">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">CATÁLOGO CENTRAL</p>
          <h2>Creación de puestos</h2>
          <p>Los cambios se reflejan automáticamente en todo el sistema.</p>
        </div>
        <div className="catalog-heading-actions">
          <span>{roles.length} puestos</span>
          {canManagePermissions && (
            <button onClick={onManagePermissions}>USUARIOS Y PERMISOS</button>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="catalog-create">
          <label>
            Nuevo puesto
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void create();
              }}
              placeholder="Ej. Coordinador de cabinas"
            />
          </label>
          <button disabled={!newName.trim()} onClick={create}>
            ＋ CREAR PUESTO
          </button>
        </div>
      )}
      {message && <p className="catalog-message">{message}</p>}
      <div className="catalog-list">
        {roles.map((role) => {
          const assigned = members.filter(
            (member) => member.jobRole === role.name,
          );
          const editing = editingId === role.id;
          const protectedRole = role.name === "Master";
          return (
            <article
              key={role.id}
              className={role.active ? "" : "inactive-role"}
            >
              <div className="catalog-role-name">
                {editing ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    autoFocus
                  />
                ) : (
                  <>
                    <b>{role.name}</b>
                    <span>
                      {assigned.length}{" "}
                      {assigned.length === 1
                        ? "empleado asignado"
                        : "empleados asignados"}
                    </span>
                  </>
                )}
              </div>
              <i>
                {protectedRole
                  ? "ACCESO TOTAL"
                  : role.active
                    ? "ACTIVO"
                    : "INACTIVO"}
              </i>
              {canEdit && !protectedRole && (
                <div className="catalog-actions">
                  {editing ? (
                    <>
                      <button onClick={() => setEditingId(0)}>Cancelar</button>
                      <button
                        className="gold"
                        disabled={!editingName.trim()}
                        onClick={() => save(role)}
                      >
                        Guardar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(role.id);
                          setEditingName(role.name);
                        }}
                      >
                        Editar
                      </button>
                      <button onClick={() => toggle(role)}>
                        {role.active ? "Desactivar" : "Activar"}
                      </button>
                      <button className="danger" onClick={() => remove(role)}>
                        Borrar
                      </button>
                    </>
                  )}
                </div>
              )}
              {protectedRole && (
                <small className="protected-role-note">
                  Puesto protegido · autoriza todos los módulos
                </small>
              )}
              <div className="catalog-role-users">
                <div className="catalog-role-users-head">
                  <b>Usuarios y permisos del puesto</b>
                  <span>{assigned.length} usuarios vinculados</span>
                </div>
                {assigned.length ? (
                  assigned.map((member) => {
                    const matrix = parsePermissions(
                      member.permissions,
                      member.isAdmin,
                    );
                    const enabled = permissionModules.filter(
                      (module) => matrix[module.key].view,
                    );
                    const editable = enabled.filter(
                      (module) => matrix[module.key].edit,
                    ).length;
                    return (
                      <div className="catalog-role-user" key={member.id}>
                        <span className="catalog-user-avatar">
                          {member.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{member.name}</strong>
                          <small>
                            @{member.username || "pendiente"} · {enabled.length}{" "}
                            módulos · {editable} con edición
                          </small>
                        </div>
                        <div className="catalog-permission-tags">
                          {enabled.slice(0, 5).map((module) => (
                            <span
                              className={
                                matrix[module.key].edit ? "editable" : ""
                              }
                              key={module.key}
                            >
                              {module.label}
                            </span>
                          ))}
                          {enabled.length > 5 && (
                            <span>＋{enabled.length - 5}</span>
                          )}
                          {!enabled.length && <i>Sin módulos autorizados</i>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p>Este puesto todavía no tiene usuarios asignados.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
