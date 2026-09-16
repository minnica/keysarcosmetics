#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
baseline="20260909010000_pos_rv4_catalog_inventory_settings"
current="20260916010000_add_pos_membership_revision_projections"

: "${POS_MIGRATION_SOURCE_DATABASE_URL:?POS_MIGRATION_SOURCE_DATABASE_URL es obligatoria}"
: "${POS_MIGRATION_TARGET_DATABASE_URL:?POS_MIGRATION_TARGET_DATABASE_URL es obligatoria}"
: "${POS_MIGRATION_RECOVERY_DATABASE_URL:?POS_MIGRATION_RECOVERY_DATABASE_URL es obligatoria}"
: "${POS_MIGRATION_FIXTURE_CONFIRMATION:?Falta la confirmación efímera}"

if [[ "$POS_MIGRATION_FIXTURE_CONFIRMATION" != "EPHEMERAL_ONLY" ]]; then
  echo "La confirmación debe ser EPHEMERAL_ONLY." >&2
  exit 1
fi

validate_url() {
  DATABASE_URL="$1" node -e '
    const url = new URL(process.env.DATABASE_URL);
    const database = url.pathname.replace(/^\//, "");
    const schema = url.searchParams.get("schema") || "public";
    if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) process.exit(1);
    if (!database.includes("pos_upgrade") || schema !== "public") process.exit(1);
    process.stdout.write(database);
  '
}

source_database="$(validate_url "$POS_MIGRATION_SOURCE_DATABASE_URL")" || {
  echo "Source debe ser PostgreSQL loopback desechable, incluir pos_upgrade y usar schema public." >&2
  exit 1
}
target_database="$(validate_url "$POS_MIGRATION_TARGET_DATABASE_URL")" || {
  echo "Target debe ser PostgreSQL loopback desechable, incluir pos_upgrade y usar schema public." >&2
  exit 1
}
recovery_database="$(validate_url "$POS_MIGRATION_RECOVERY_DATABASE_URL")" || {
  echo "Recovery debe ser PostgreSQL loopback desechable, incluir pos_upgrade y usar schema public." >&2
  exit 1
}

if [[ "$source_database" == "$target_database" || "$source_database" == "$recovery_database" || "$target_database" == "$recovery_database" ]]; then
  echo "Source, target y recovery deben ser tres bases distintas." >&2
  exit 1
fi

client_mode="native"
if ! command -v pg_dump >/dev/null || ! command -v pg_restore >/dev/null || ! command -v psql >/dev/null; then
  client_mode="container"
  : "${POS_MIGRATION_POSTGRES_CONTAINER:?Sin clientes PostgreSQL locales, POS_MIGRATION_POSTGRES_CONTAINER es obligatorio}"
  podman inspect "$POS_MIGRATION_POSTGRES_CONTAINER" >/dev/null
fi

query_database() {
  local url="$1"
  local database="$2"
  local sql="$3"
  if [[ "$client_mode" == "native" ]]; then
    psql "$url" -v ON_ERROR_STOP=1 -Atqc "$sql"
  else
    podman exec --user postgres "$POS_MIGRATION_POSTGRES_CONTAINER" \
      psql --dbname "$database" -v ON_ERROR_STOP=1 -Atqc "$sql"
  fi
}

assert_empty_database() {
  local url="$1"
  local database="$2"
  local count
  count="$(query_database "$url" "$database" "SELECT COUNT(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');")"
  if [[ "$count" != "0" ]]; then
    echo "La base local $database debe estar vacía; contiene $count tablas." >&2
    exit 1
  fi
}

dump_database() {
  local url="$1"
  local database="$2"
  local destination="$3"
  if [[ "$client_mode" == "native" ]]; then
    pg_dump --format=custom --no-owner --no-privileges --dbname "$url" --file "$destination"
  else
    podman exec --user postgres "$POS_MIGRATION_POSTGRES_CONTAINER" \
      pg_dump --format=custom --no-owner --no-privileges --dbname "$database" >"$destination"
  fi
}

restore_database() {
  local url="$1"
  local database="$2"
  local source="$3"
  if [[ "$client_mode" == "native" ]]; then
    pg_restore --exit-on-error --no-owner --no-privileges --dbname "$url" "$source"
  else
    podman exec --interactive --user postgres "$POS_MIGRATION_POSTGRES_CONTAINER" \
      pg_restore --exit-on-error --no-owner --no-privileges --dbname "$database" <"$source"
  fi
}

list_backup() {
  local source="$1"
  if [[ "$client_mode" == "native" ]]; then
    pg_restore --list "$source"
  else
    podman exec --interactive --user postgres "$POS_MIGRATION_POSTGRES_CONTAINER" \
      pg_restore --list <"$source"
  fi
}

assert_empty_database "$POS_MIGRATION_SOURCE_DATABASE_URL" "$source_database"
assert_empty_database "$POS_MIGRATION_TARGET_DATABASE_URL" "$target_database"
assert_empty_database "$POS_MIGRATION_RECOVERY_DATABASE_URL" "$recovery_database"

tmp_root="$(mktemp -d)"
trap 'rm -rf -- "$tmp_root"' EXIT
mkdir -p "$tmp_root/prisma/migrations"
cp "$repo_root/backend/api/prisma/schema.prisma" "$tmp_root/prisma/schema.prisma"
cp "$repo_root/backend/api/prisma/migrations/migration_lock.toml" "$tmp_root/prisma/migrations/migration_lock.toml"

baseline_count=0
current_count=0
for migration in "$repo_root"/backend/api/prisma/migrations/*; do
  [[ -d "$migration" ]] || continue
  name="$(basename "$migration")"
  current_count=$((current_count + 1))
  if [[ "$name" > "$baseline" ]]; then
    continue
  fi
  cp -R "$migration" "$tmp_root/prisma/migrations/$name"
  baseline_count=$((baseline_count + 1))
done

if [[ "$baseline_count" -ne 45 || "$current_count" -ne 46 ]]; then
  echo "Cadena inesperada: baseline=$baseline_count (esperado 45), actual=$current_count (esperado 46)." >&2
  exit 1
fi
if [[ ! -d "$repo_root/backend/api/prisma/migrations/$current" ]]; then
  echo "Falta la migración actual esperada $current." >&2
  exit 1
fi

export POS_MIGRATION_FIXTURE_CONFIRMATION
export DATABASE_URL="$POS_MIGRATION_SOURCE_DATABASE_URL"
export DIRECT_URL="$POS_MIGRATION_SOURCE_DATABASE_URL"

pnpm --dir "$repo_root/backend/api" exec prisma migrate deploy --schema "$tmp_root/prisma/schema.prisma"
pnpm --dir "$repo_root/backend/api" exec prisma generate
pnpm --dir "$repo_root/backend/api" exec tsx scripts/pos-migration-recovery-fixture.ts seed
pnpm --dir "$repo_root/backend/api" exec tsx scripts/pos-migration-recovery-fixture.ts verify-baseline

backup_file="$tmp_root/pos-rv9-p3-baseline.dump"
dump_database "$POS_MIGRATION_SOURCE_DATABASE_URL" "$source_database" "$backup_file"
backup_sha256="$(sha256sum "$backup_file" | cut -d ' ' -f 1)"
backup_bytes="$(wc -c <"$backup_file" | tr -d ' ')"
if [[ "$backup_bytes" -le 0 ]]; then
  echo "El respaldo lógico quedó vacío." >&2
  exit 1
fi
backup_listing="$(list_backup "$backup_file")"
for required_relation in _prisma_migrations PosTicket PosClientMembership PosSyncOperation AuditLog; do
  if ! grep -Fq "$required_relation" <<<"$backup_listing"; then
    echo "El respaldo no contiene $required_relation." >&2
    exit 1
  fi
done

restore_database "$POS_MIGRATION_TARGET_DATABASE_URL" "$target_database" "$backup_file"
restore_database "$POS_MIGRATION_RECOVERY_DATABASE_URL" "$recovery_database" "$backup_file"

for restored_url in "$POS_MIGRATION_TARGET_DATABASE_URL" "$POS_MIGRATION_RECOVERY_DATABASE_URL"; do
  export DATABASE_URL="$restored_url"
  export DIRECT_URL="$restored_url"
  pnpm --dir "$repo_root/backend/api" exec tsx scripts/pos-migration-recovery-fixture.ts verify-baseline
  pnpm --dir "$repo_root/backend/api" exec prisma migrate deploy
  pnpm --dir "$repo_root/backend/api" exec tsx scripts/pos-migration-recovery-fixture.ts verify-current
done

printf '{"status":"PASS","baseline":"%s","baselineMigrationCount":%d,"current":"%s","currentMigrationCount":%d,"backupSha256":"%s","backupBytes":%s,"restoredDatabases":2,"upgradedDatabases":2,"clientMode":"%s"}\n' \
  "$baseline" "$baseline_count" "$current" "$current_count" "$backup_sha256" "$backup_bytes" "$client_mode"
