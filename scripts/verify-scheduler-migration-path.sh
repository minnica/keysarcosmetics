#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
baseline="20260904080000_add_scheduler_customers"

: "${SCHEDULER_UPGRADE_DATABASE_URL:?SCHEDULER_UPGRADE_DATABASE_URL es obligatoria}"
: "${SCHEDULER_MIGRATION_FIXTURE_CONFIRMATION:?Falta la confirmación efímera}"

DATABASE_URL="$SCHEDULER_UPGRADE_DATABASE_URL" node -e '
  const url = new URL(process.env.DATABASE_URL);
  const database = url.pathname.replace(/^\//, "");
  const schema = url.searchParams.get("schema") || "";
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) process.exit(1);
  if (!database.includes("scheduler_upgrade") && !schema.includes("scheduler_upgrade")) process.exit(1);
' || {
  echo "La verificación sólo admite una PostgreSQL local efímera con scheduler_upgrade en la base o schema." >&2
  exit 1
}

if [[ "$SCHEDULER_MIGRATION_FIXTURE_CONFIRMATION" != "EPHEMERAL_ONLY" ]]; then
  echo "La confirmación debe ser EPHEMERAL_ONLY." >&2
  exit 1
fi

schema_name="$(DATABASE_URL="$SCHEDULER_UPGRADE_DATABASE_URL" node -e '
  const schema = new URL(process.env.DATABASE_URL).searchParams.get("schema") || "";
  if (schema && !/^[A-Za-z0-9_]+$/.test(schema)) process.exit(1);
  process.stdout.write(schema);
')" || {
  echo "El nombre del schema efímero no es seguro." >&2
  exit 1
}
if [[ -n "$schema_name" && "$schema_name" != "public" ]]; then
  schema_sql="CREATE SCHEMA IF NOT EXISTS \"$schema_name\";"
  pnpm --dir "$repo_root/backend/api" exec prisma db execute \
    --stdin \
    --url "$SCHEDULER_UPGRADE_DATABASE_URL" <<< "$schema_sql"
fi

tmp_root="$(mktemp -d)"
trap 'rm -rf -- "$tmp_root"' EXIT
mkdir -p "$tmp_root/prisma/migrations"
cp "$repo_root/backend/api/prisma/schema.prisma" "$tmp_root/prisma/schema.prisma"
cp "$repo_root/backend/api/prisma/migrations/migration_lock.toml" "$tmp_root/prisma/migrations/migration_lock.toml"

migration_count=0
for migration in "$repo_root"/backend/api/prisma/migrations/*; do
  [[ -d "$migration" ]] || continue
  name="$(basename "$migration")"
  if [[ "$name" > "$baseline" ]]; then
    continue
  fi
  cp -R "$migration" "$tmp_root/prisma/migrations/$name"
  migration_count=$((migration_count + 1))
done

if [[ "$migration_count" -ne 39 ]]; then
  echo "Se esperaban 39 migraciones hasta $baseline; se encontraron $migration_count." >&2
  exit 1
fi

export DATABASE_URL="$SCHEDULER_UPGRADE_DATABASE_URL"
export DIRECT_URL="${SCHEDULER_UPGRADE_DIRECT_URL:-$SCHEDULER_UPGRADE_DATABASE_URL}"

pnpm --dir "$repo_root/backend/api" exec prisma migrate deploy --schema "$tmp_root/prisma/schema.prisma"
pnpm --filter @cosmetics/api run scheduler:migration:fixture seed
pnpm --filter @cosmetics/api db:migrate:deploy
pnpm --filter @cosmetics/api run scheduler:migration:fixture verify
