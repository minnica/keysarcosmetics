-- Ejecutar exclusivamente en el proyecto vacío del piloto. El importador comprueba la identidad antes de este archivo.
CREATE SCHEMA IF NOT EXISTS payroll_pilot;
REVOKE ALL ON SCHEMA payroll_pilot FROM PUBLIC;
CREATE TABLE IF NOT EXISTS payroll_pilot.identity (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), project_ref text NOT NULL);
CREATE TABLE IF NOT EXISTS payroll_pilot.cuts (
  seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, id uuid NOT NULL UNIQUE, captured_at timestamptz NOT NULL UNIQUE,
  original jsonb NOT NULL, changes jsonb NOT NULL DEFAULT '{}', revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz, updated_by text
);
REVOKE ALL ON ALL TABLES IN SCHEMA payroll_pilot FROM PUBLIC;
ALTER TABLE payroll_pilot.cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_pilot.identity ENABLE ROW LEVEL SECURITY;
