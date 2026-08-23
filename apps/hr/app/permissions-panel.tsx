"use client";

import { useEffect, useRef, useState } from "react";
import {
  fullPermissions,
  parsePermissions,
  permissionModules,
  type PermissionKey,
  type PermissionSet,
} from "./access-permissions";
import type { InterfaceLocale } from "./interface-locales";

type PermissionUser = {
  id: number;
  name: string;
  username: string | null;
  jobRole: string;
  isAdmin: boolean;
  isActive: boolean;
  permissions: string;
};

const permissionCopy = {
  es: {
    title: "Usuarios y permisos",
    intro:
      "Abre cada usuario para consultar y modificar sus módulos. Los menús no autorizados se ocultarán.",
    view: "Ver",
    edit: "Editar",
    module: "Módulo",
    all: "Todos los permisos",
    active: "ACTIVO",
    inactive: "INACTIVO",
    masterNote:
      "El puesto Master conserva acceso total y sus permisos no pueden desactivarse.",
    userNote: "Al guardar, el usuario sólo verá los módulos autorizados.",
    save: "GUARDAR PERMISOS",
    generate: "CREAR USUARIO Y CONTRASEÑA MASTER",
  },
  en: {
    title: "Users and permissions",
    intro: "Open each user to review and modify their modules.",
    view: "View",
    edit: "Edit",
    module: "Module",
    all: "All permissions",
    active: "ACTIVE",
    inactive: "INACTIVE",
    masterNote:
      "The Master keeps full access and these permissions cannot be disabled.",
    userNote: "Changes apply on the user's next sign-in.",
    save: "SAVE PERMISSIONS",
    generate: "GENERATE MASTER PASSWORD",
  },
  fr: {
    title: "Utilisateurs et autorisations",
    intro: "Ouvrez chaque utilisateur pour consulter et modifier ses modules.",
    view: "Voir",
    edit: "Modifier",
    module: "Module",
    all: "Toutes les autorisations",
    active: "ACTIF",
    inactive: "INACTIF",
    masterNote:
      "Le Maître conserve un accès total et ses autorisations ne peuvent pas être désactivées.",
    userNote: "Les changements s’appliquent à la prochaine connexion.",
    save: "ENREGISTRER",
    generate: "GÉNÉRER LE MOT DE PASSE",
  },
  pt: {
    title: "Usuários e permissões",
    intro: "Abra cada usuário para consultar e modificar seus módulos.",
    view: "Ver",
    edit: "Editar",
    module: "Módulo",
    all: "Todas as permissões",
    active: "ATIVO",
    inactive: "INATIVO",
    masterNote:
      "O Mestre mantém acesso total e suas permissões não podem ser desativadas.",
    userNote: "As alterações serão aplicadas no próximo acesso.",
    save: "SALVAR PERMISSÕES",
    generate: "GERAR SENHA MASTER",
  },
} as const;

export default function PermissionsPanel({
  users,
  onSaved,
  locale = "es",
}: {
  users: PermissionUser[];
  onSaved: () => Promise<void>;
  locale?: InterfaceLocale;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const [drafts, setDrafts] = useState<Record<number, PermissionSet>>({});
  const [savingId, setSavingId] = useState(0);
  const [message, setMessage] = useState("");
  const [masterCredentials, setMasterCredentials] = useState<{
    userId: number;
    password: string;
  } | null>(null);
  const copy = permissionCopy[locale];

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        users.map((user) => [
          user.id,
          parsePermissions(user.permissions, user.isAdmin),
        ]),
      ),
    );
  }, [users]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const open =
        rootRef.current?.querySelector<HTMLDetailsElement>("details[open]");
      if (open && !open.contains(event.target as Node)) open.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function toggle(
    user: PermissionUser,
    module: PermissionKey,
    field: "view" | "edit",
  ) {
    if (user.isAdmin) return;
    setDrafts((current) => {
      const next = structuredClone(
        current[user.id] || parsePermissions(user.permissions),
      );
      const value = !next[module][field];
      next[module][field] = value;
      if (field === "edit" && value) next[module].view = true;
      if (field === "view" && !value) next[module].edit = false;
      return { ...current, [user.id]: next };
    });
  }

  async function request(payload: Record<string, unknown>) {
    const response = await fetch("/api/app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    const data = (() => {
      try {
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })();
    if (!response.ok)
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "No fue posible guardar los permisos.",
      );
    return data;
  }

  async function save(user: PermissionUser) {
    if (user.isAdmin) return;
    setSavingId(user.id);
    setMessage("");
    try {
      await request({
        action: "permissions_update",
        id: user.id,
        permissions: drafts[user.id],
      });
      setMessage(`Permisos de ${user.name} guardados correctamente.`);
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible guardar los permisos.",
      );
    } finally {
      setSavingId(0);
    }
  }

  async function resetMaster(user: PermissionUser) {
    setSavingId(user.id);
    setMessage("");
    try {
      const data = await request({ action: "master_credentials", id: user.id });
      setMasterCredentials({
        userId: user.id,
        password: String(data.temporaryPassword || ""),
      });
      setMessage("Usuario y contraseña Master creados correctamente.");
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible generar la contraseña del Maestro.",
      );
    } finally {
      setSavingId(0);
    }
  }

  return (
    <section className="access-management" ref={rootRef}>
      <div className="access-management-head">
        <div>
          <p className="eyebrow">CONTROL DE ACCESO</p>
          <h2>{copy.title}</h2>
          <span>{copy.intro}</span>
        </div>
        <div className="permission-legend">
          <span>
            <i className="view-dot" /> {copy.view}
          </span>
          <span>
            <i className="edit-dot" /> {copy.edit}
          </span>
        </div>
      </div>
      {message && <p className="permission-message">{message}</p>}
      {[...users]
        .sort(
          (a, b) =>
            Number(b.isAdmin) - Number(a.isAdmin) ||
            a.name.localeCompare(b.name, "es"),
        )
        .map((user) => {
          const matrix = user.isAdmin
            ? fullPermissions()
            : drafts[user.id] || parsePermissions(user.permissions);
          return (
            <details
              className={`permission-user-card ${user.isAdmin ? "master" : ""}`}
              key={user.id}
            >
              <summary>
                <span className="permission-avatar">
                  {user.isAdmin
                    ? "M"
                    : user.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                </span>
                <div>
                  <h3>{user.isAdmin ? "Usuario Maestro" : user.name}</h3>
                  <p>
                    @{user.username || (user.isAdmin ? "master" : "pendiente")}{" "}
                    · {user.isAdmin ? copy.all : user.jobRole}
                  </p>
                </div>
                <i
                  className={
                    user.isAdmin || user.isActive ? "active" : "inactive"
                  }
                >
                  {user.isAdmin
                    ? "MASTER"
                    : user.isActive
                      ? copy.active
                      : copy.inactive}
                </i>
                <b className="permission-chevron">⌄</b>
              </summary>
              <div className="permission-matrix">
                <div className="permission-row permission-header">
                  <span>{copy.module}</span>
                  <b>{copy.view}</b>
                  <b>{copy.edit}</b>
                </div>
                {permissionModules.map((module) => (
                  <div className="permission-row" key={module.key}>
                    <div>
                      <strong>{module.label}</strong>
                      <small>{module.description}</small>
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={matrix[module.key].view}
                        disabled={user.isAdmin}
                        onChange={() => toggle(user, module.key, "view")}
                      />
                      <span />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={matrix[module.key].edit}
                        disabled={user.isAdmin}
                        onChange={() => toggle(user, module.key, "edit")}
                      />
                      <span />
                    </label>
                  </div>
                ))}
              </div>
              <footer>
                {user.isAdmin ? (
                  <>
                    <span>{copy.masterNote}</span>
                    <button
                      disabled={savingId === user.id}
                      onClick={() => resetMaster(user)}
                    >
                      {savingId === user.id ? "GENERANDO…" : copy.generate}
                    </button>
                  </>
                ) : (
                  <>
                    <span>{copy.userNote}</span>
                    <button
                      disabled={savingId === user.id}
                      onClick={() => save(user)}
                    >
                      {savingId === user.id ? "GUARDANDO…" : copy.save}
                    </button>
                  </>
                )}
              </footer>
              {user.isAdmin && masterCredentials?.userId === user.id && (
                <div className="master-credentials">
                  <span>USUARIO</span>
                  <strong>{user.username || "master"}</strong>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(user.username || "master")
                    }
                  >
                    Copiar
                  </button>
                  <span>CONTRASEÑA</span>
                  <strong>{masterCredentials.password}</strong>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(masterCredentials.password)
                    }
                  >
                    Copiar
                  </button>
                </div>
              )}
            </details>
          );
        })}
    </section>
  );
}
