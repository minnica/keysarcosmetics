import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";

// PostgreSQL acepta el verificador SCRAM al crear el rol. La contraseña no pasa por el historial SQL.
function verifier(password: string) {
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(password))
    throw Error("Clave de servicio inválida.");
  const salt = randomBytes(16);
  const key = pbkdf2Sync(password, salt, 4096, 32, "sha256");
  const client = createHmac("sha256", key).update("Client Key").digest();
  const stored = createHash("sha256").update(client).digest("base64");
  const server = createHmac("sha256", key)
    .update("Server Key")
    .digest("base64");
  return (
    "SCRAM-SHA-256$4096:" +
    salt.toString("base64") +
    "$" +
    stored +
    ":" +
    server
  );
}

export function pilotRoleStatements(
  runtimePassword?: string,
  loaderPassword?: string,
) {
  const statements: string[] = [];
  for (const [role, password] of [
    ["keysar_pilot_runtime", runtimePassword],
    ["keysar_pilot_loader", loaderPassword],
  ] as const) {
    if (!password) continue;
    const sql = verifier(password);
    statements.push(
      `DO $create_role$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${role}') THEN
       CREATE ROLE ${role} LOGIN NOBYPASSRLS NOINHERIT PASSWORD '${sql}'; END IF; END $create_role$`,
      `GRANT USAGE ON SCHEMA payroll_pilot TO ${role}`,
      `GRANT SELECT ON payroll_pilot.identity, payroll_pilot.cuts TO ${role}`,
    );
    for (const table of ["identity", "cuts"]) {
      statements.push(
        `DROP POLICY IF EXISTS ${role}_read ON payroll_pilot.${table}`,
        `CREATE POLICY ${role}_read ON payroll_pilot.${table} FOR SELECT TO ${role} USING (true)`,
      );
    }
    if (role === "keysar_pilot_runtime") {
      statements.push(
        `GRANT UPDATE (changes,revision,updated_at,updated_by) ON payroll_pilot.cuts TO ${role}`,
        `GRANT SELECT, INSERT, DELETE ON payroll_pilot.login_codes TO ${role}`,
        "DROP POLICY IF EXISTS pilot_login_codes ON payroll_pilot.login_codes",
        `CREATE POLICY pilot_login_codes ON payroll_pilot.login_codes FOR ALL TO ${role} USING (true) WITH CHECK (true)`,
        "DROP POLICY IF EXISTS pilot_edit ON payroll_pilot.cuts",
        `CREATE POLICY pilot_edit ON payroll_pilot.cuts FOR UPDATE TO ${role} USING (true) WITH CHECK (true)`,
      );
    } else {
      statements.push(
        `GRANT INSERT (id,captured_at,original) ON payroll_pilot.cuts TO ${role}`,
        `GRANT USAGE ON SEQUENCE payroll_pilot.cuts_seq_seq TO ${role}`,
        "DROP POLICY IF EXISTS pilot_append ON payroll_pilot.cuts",
        `CREATE POLICY pilot_append ON payroll_pilot.cuts FOR INSERT TO ${role} WITH CHECK (true)`,
      );
    }
  }
  return statements;
}
