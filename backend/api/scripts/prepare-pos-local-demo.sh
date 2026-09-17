#!/usr/bin/env bash
set -euo pipefail

api_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$api_root/../.." && pwd)"
state_dir="${POS_DEMO_STATE_DIR:-$repo_root/.pos-runner/rv10-p1-local}"
config_file="$state_dir/config.env"
pid_file="$state_dir/api.pid"
api_log="$state_dir/api.log"
empty_env="$state_dir/empty.env"
container_name="${POS_DEMO_POSTGRES_CONTAINER:-keysar-rv10-p1-pg}"
postgres_image="${POS_DEMO_POSTGRES_IMAGE:-docker.io/library/postgres:16-alpine}"
db_port="${POS_DEMO_DB_PORT:-55470}"
api_port="${POS_DEMO_API_PORT:-4410}"
api_host="${POS_DEMO_API_HOST:-127.0.0.1}"
db_name="keysar_pos_demo"
db_user="keysar_pos_demo"
cors_origins="${POS_DEMO_CORS_ORIGINS:-http://127.0.0.1:3005,http://localhost:3005}"
command_name="${1:-help}"

fail() {
  echo "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Falta el comando requerido: $1"
}

validate_port() {
  local value="$1"
  local label="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || fail "$label debe ser un puerto numérico."
  ((value >= 1024 && value <= 65535)) || fail "$label debe estar entre 1024 y 65535."
}

validate_inputs() {
  local origin
  local -a configured_origins
  validate_port "$db_port" "POS_DEMO_DB_PORT"
  validate_port "$api_port" "POS_DEMO_API_PORT"
  [[ "$db_port" != "$api_port" ]] || fail "Los puertos de API y PostgreSQL deben ser distintos."
  [[ "$api_host" == "127.0.0.1" || "$api_host" == "localhost" || "$api_host" == "::1" ]] ||
    fail "POS_DEMO_API_HOST debe ser loopback; este helper no expone la API a la red."
  [[ "$container_name" == keysar-rv10-p1-* ]] ||
    fail "POS_DEMO_POSTGRES_CONTAINER debe comenzar con keysar-rv10-p1-."
  [[ "$postgres_image" == *postgres:16* ]] ||
    fail "POS_DEMO_POSTGRES_IMAGE debe ser una imagen PostgreSQL 16 explícita."
  [[ "$state_dir" == "$repo_root/.pos-runner/"* ]] ||
    fail "POS_DEMO_STATE_DIR debe quedar dentro de $repo_root/.pos-runner/."
  IFS=',' read -r -a configured_origins <<<"$cors_origins"
  ((${#configured_origins[@]} > 0)) || fail "POS_DEMO_CORS_ORIGINS no puede estar vacío."
  for origin in "${configured_origins[@]}"; do
    [[ "$origin" =~ ^http://(127\.0\.0\.1|localhost|\[::1\]):[0-9]+$ ]] ||
      fail "Cada origin CORS debe ser HTTP, loopback y contener puerto: $origin"
  done
}

require_confirmation() {
  [[ "${POS_DEMO_CONFIRMATION:-}" == "LOCAL_SYNTHETIC_ONLY" ]] ||
    fail "Define POS_DEMO_CONFIRMATION=LOCAL_SYNTHETIC_ONLY para preparar la BD local aislada."
}

candidate_sha() {
  git -C "$repo_root" rev-parse HEAD
}

write_initial_config() {
  local release_sha="$1"
  local db_password jwt_secret pos_jwt_secret pos_pin_pepper
  db_password="$(openssl rand -hex 24)"
  jwt_secret="$(openssl rand -hex 32)"
  pos_jwt_secret="$(openssl rand -hex 32)"
  pos_pin_pepper="$(openssl rand -hex 32)"

  umask 077
  mkdir -p "$state_dir"
  : >"$empty_env"
  {
    printf 'POS_DEMO_RELEASE_SHA=%s\n' "$release_sha"
    printf 'POS_DEMO_DB_PASSWORD=%s\n' "$db_password"
    printf 'POS_DEMO_JWT_SECRET=%s\n' "$jwt_secret"
    printf 'POS_DEMO_POS_JWT_SECRET=%s\n' "$pos_jwt_secret"
    printf 'POS_DEMO_POS_PIN_PEPPER=%s\n' "$pos_pin_pepper"
  } >"$config_file"
}

load_config() {
  [[ -f "$config_file" ]] || fail "No existe $config_file; ejecuta up primero."
  # El archivo sólo lo genera este helper con valores hexadecimales y un SHA.
  # shellcheck disable=SC1090
  source "$config_file"
  : "${POS_DEMO_RELEASE_SHA:?Estado local incompleto}"
  : "${POS_DEMO_DB_PASSWORD:?Estado local incompleto}"
  : "${POS_DEMO_JWT_SECRET:?Estado local incompleto}"
  : "${POS_DEMO_POS_JWT_SECRET:?Estado local incompleto}"
  : "${POS_DEMO_POS_PIN_PEPPER:?Estado local incompleto}"
}

database_url() {
  printf 'postgresql://%s:%s@127.0.0.1:%s/%s?schema=public' \
    "$db_user" "$POS_DEMO_DB_PASSWORD" "$db_port" "$db_name"
}

api_is_running() {
  [[ -f "$pid_file" ]] || return 1
  local pid args
  pid="$(<"$pid_file")"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  args="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  [[ "$args" == *"$api_root/dist/index.js"* ]]
}

wait_for_postgres() {
  local attempt
  for attempt in {1..60}; do
    if podman exec "$container_name" pg_isready --username "$db_user" --dbname "$db_name" >/dev/null 2>&1; then
      return
    fi
    sleep 0.5
  done
  fail "PostgreSQL no quedó listo; revisa podman logs $container_name."
}

wait_for_api() {
  local attempt
  for attempt in {1..60}; do
    if curl --fail --silent --show-error "http://127.0.0.1:$api_port/health" >/dev/null 2>&1; then
      return
    fi
    if [[ -f "$pid_file" ]] && ! api_is_running; then
      fail "La API terminó durante el arranque; revisa $api_log."
    fi
    sleep 0.5
  done
  fail "La API no quedó lista; revisa $api_log."
}

assert_container_binding() {
  local published
  published="$(podman port "$container_name" 5432/tcp)"
  [[ "$published" == "127.0.0.1:$db_port" ]] ||
    fail "PostgreSQL no está limitado al loopback esperado: $published"
}

start_postgres() {
  if podman container exists "$container_name"; then
    local configured_port
    configured_port="$(podman inspect --format '{{range (index .HostConfig.PortBindings "5432/tcp")}}{{.HostIP}}:{{.HostPort}}{{end}}' "$container_name")"
    [[ "$configured_port" == "127.0.0.1:$db_port" ]] ||
      fail "El contenedor existente no usa el binding esperado 127.0.0.1:$db_port."
    podman start "$container_name" >/dev/null
  else
    podman image exists "$postgres_image" ||
      fail "La imagen $postgres_image no está disponible localmente; cárgala de forma autorizada antes de continuar."
    podman run --detach \
      --name "$container_name" \
      --label io.keysar.scope=rv10-p1-local-demo \
      --publish "127.0.0.1:$db_port:5432" \
      --env "POSTGRES_DB=$db_name" \
      --env "POSTGRES_USER=$db_user" \
      --env "POSTGRES_PASSWORD=$POS_DEMO_DB_PASSWORD" \
      "$postgres_image" >/dev/null
  fi
  wait_for_postgres
  assert_container_binding
}

apply_migrations() {
  local url
  url="$(database_url)"
  DATABASE_URL="$url" DIRECT_URL="$url" DOTENV_CONFIG_PATH="$empty_env" \
    pnpm --dir "$api_root" exec prisma migrate deploy
}

build_api() {
  local url
  url="$(database_url)"
  DATABASE_URL="$url" DIRECT_URL="$url" DOTENV_CONFIG_PATH="$empty_env" \
    pnpm --dir "$api_root" build
}

start_api() {
  if api_is_running; then
    return
  fi
  rm -f "$pid_file"
  local url
  url="$(database_url)"
  (
    cd "$api_root"
    nohup env \
      NODE_ENV=production \
      DOTENV_CONFIG_PATH="$empty_env" \
      DATABASE_URL="$url" \
      DIRECT_URL="$url" \
      JWT_SECRET="$POS_DEMO_JWT_SECRET" \
      POS_JWT_SECRET="$POS_DEMO_POS_JWT_SECRET" \
      POS_PIN_PEPPER="$POS_DEMO_POS_PIN_PEPPER" \
      AGENDA_PROVIDER=internal \
      SCHEDULER_MESSAGING_PROVIDER=disabled \
      RELEASE_SHA="$POS_DEMO_RELEASE_SHA" \
      CORS_ORIGINS="$cors_origins" \
      HOST="$api_host" \
      PORT="$api_port" \
      node "$api_root/dist/index.js" >"$api_log" 2>&1 &
    printf '%s\n' "$!" >"$pid_file"
  )
  wait_for_api
}

verify_release() {
  local health ready allowed_headers denied_headers migration_count listener allowed_origin
  allowed_origin="${cors_origins%%,*}"
  health="$(curl --fail --silent --show-error "http://127.0.0.1:$api_port/health")"
  HEALTH_JSON="$health" EXPECTED_SHA="$POS_DEMO_RELEASE_SHA" node -e '
    const body = JSON.parse(process.env.HEALTH_JSON);
    if (body.status !== "ok" || body.release !== process.env.EXPECTED_SHA) process.exit(1);
  '

  ready="$(curl --fail --silent --show-error "http://127.0.0.1:$api_port/ready")"
  READY_JSON="$ready" node -e '
    const body = JSON.parse(process.env.READY_JSON);
    if (body.status !== "ready") process.exit(1);
  '

  allowed_headers="$(curl --silent --show-error --dump-header - --output /dev/null \
    --request OPTIONS \
    --header "Origin: $allowed_origin" \
    --header 'Access-Control-Request-Method: GET' \
    "http://127.0.0.1:$api_port/health" | tr -d '\r')"
  grep -Fqi "access-control-allow-origin: $allowed_origin" <<<"$allowed_headers" ||
    fail "CORS no devolvió el origin local permitido."

  denied_headers="$(curl --silent --show-error --dump-header - --output /dev/null \
    --request OPTIONS \
    --header 'Origin: https://example.invalid' \
    --header 'Access-Control-Request-Method: GET' \
    "http://127.0.0.1:$api_port/health" | tr -d '\r')"
  if grep -Fqi 'access-control-allow-origin: https://example.invalid' <<<"$denied_headers"; then
    fail "CORS aceptó un origin no configurado."
  fi

  migration_count="$(podman exec --user postgres "$container_name" \
    psql --username "$db_user" --dbname "$db_name" --tuples-only --no-align \
      --command 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;')"
  [[ "$migration_count" == "46" ]] || fail "Se esperaban 46 migraciones aplicadas y se encontraron $migration_count."

  listener="$(ss -H -ltn "sport = :$api_port" | awk '{print $4}')"
  [[ "$listener" == "127.0.0.1:$api_port" ]] ||
    fail "La API no está limitada al loopback esperado: $listener"
  assert_container_binding

  printf '{"status":"PASS","release":"%s","apiUrl":"http://127.0.0.1:%s","apiBinding":"loopback","databaseBinding":"loopback","migrationCount":46,"ready":true,"corsAllowed":true,"corsRejected":true}\n' \
    "$POS_DEMO_RELEASE_SHA" "$api_port"
}

run_up() {
  require_confirmation
  require_command curl
  require_command git
  require_command node
  require_command openssl
  require_command pnpm
  require_command podman
  require_command ss
  validate_inputs

  local current_sha
  current_sha="$(candidate_sha)"
  if [[ -n "${POS_DEMO_EXPECTED_SHA:-}" && "$POS_DEMO_EXPECTED_SHA" != "$current_sha" ]]; then
    fail "HEAD no coincide con POS_DEMO_EXPECTED_SHA."
  fi
  if [[ ! -f "$config_file" ]] && podman container exists "$container_name"; then
    fail "Existe $container_name pero falta su estado local; consérvalo y usa otro contenedor/state dir/puertos."
  fi
  if [[ ! -f "$config_file" ]]; then
    write_initial_config "$current_sha"
  fi
  load_config
  [[ "$POS_DEMO_RELEASE_SHA" == "$current_sha" ]] ||
    fail "El estado local pertenece a otro SHA; conserva esos datos y usa otro POS_DEMO_STATE_DIR/contenedor/puertos."

  start_postgres
  apply_migrations
  build_api
  start_api
  verify_release
}

run_verify() {
  require_command curl
  require_command node
  require_command podman
  require_command ss
  validate_inputs
  load_config
  podman container exists "$container_name" || fail "No existe el contenedor $container_name."
  api_is_running || fail "La API local no está en ejecución; ejecuta up."
  verify_release
}

run_status() {
  validate_inputs
  local release="sin-preparar" api_status="detenida" db_status="inexistente"
  if [[ -f "$config_file" ]]; then
    load_config
    release="$POS_DEMO_RELEASE_SHA"
  fi
  if api_is_running; then
    api_status="activa"
  fi
  if command -v podman >/dev/null 2>&1 && podman container exists "$container_name"; then
    db_status="$(podman inspect --format '{{.State.Status}}' "$container_name")"
  fi
  printf '{"release":"%s","api":"%s","database":"%s","stateDir":"%s"}\n' \
    "$release" "$api_status" "$db_status" "$state_dir"
}

run_down() {
  validate_inputs
  if api_is_running; then
    local pid
    pid="$(<"$pid_file")"
    kill -TERM "$pid"
    local attempt
    for attempt in {1..40}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.25
    done
    kill -0 "$pid" 2>/dev/null && fail "La API no se detuvo de forma ordenada (PID $pid)."
  fi
  rm -f "$pid_file"
  if command -v podman >/dev/null 2>&1 && podman container exists "$container_name"; then
    if [[ "$(podman inspect --format '{{.State.Running}}' "$container_name")" == "true" ]]; then
      podman stop --time 10 "$container_name" >/dev/null
    fi
  fi
  echo "API y PostgreSQL detenidos; contenedor, BD y estado local se conservaron."
}

case "$command_name" in
  up) run_up ;;
  verify) run_verify ;;
  status) run_status ;;
  down) run_down ;;
  *)
    cat <<'USAGE'
Uso: backend/api/scripts/prepare-pos-local-demo.sh up|verify|status|down

up requiere POS_DEMO_CONFIRMATION=LOCAL_SYNTHETIC_ONLY. Prepara PostgreSQL 16
en loopback, aplica la cadena vigente, compila/inicia el API en loopback y
verifica SHA, readiness y CORS. down detiene procesos sin eliminar la BD.
USAGE
    ;;
esac
