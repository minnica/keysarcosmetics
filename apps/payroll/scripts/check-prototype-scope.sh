#!/usr/bin/env bash

set -euo pipefail

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"

changes_file="$(mktemp)"
trap 'rm -f "$changes_file"' EXIT

git diff --name-only >>"$changes_file"
git diff --cached --name-only >>"$changes_file"
git ls-files --others --exclude-standard >>"$changes_file"

if git rev-parse --verify develop >/dev/null 2>&1; then
  base_branch="develop"
else
  base_branch="origin/develop"
fi

merge_base="$(git merge-base "$base_branch" HEAD)"
git diff --name-only "${merge_base}...HEAD" >>"$changes_file"
sort -u -o "$changes_file" "$changes_file"

scope_violations="$(awk '$0 !~ /^apps\/payroll\// { print }' "$changes_file")"
forbidden_pattern="fetch[[:space:]]*\\(|@cosmetics/(api-client|auth)|process\\.env|localStorage|sessionStorage|indexedDB|from[[:space:]]+[\"']axios[\"']"
runtime_violations="$(rg -n --glob '*.{ts,tsx,js,jsx}' "$forbidden_pattern" apps/payroll/src || true)"

if [[ -n "$scope_violations" || -n "$runtime_violations" ]]; then
  echo "El prototipo incumple sus límites de seguridad." >&2

  if [[ -n "$scope_violations" ]]; then
    echo >&2
    echo "Cambios fuera de apps/payroll:" >&2
    echo "$scope_violations" | sed 's/^/- /' >&2
  fi

  if [[ -n "$runtime_violations" ]]; then
    echo >&2
    echo "Integraciones o persistencia prohibidas en el frontend:" >&2
    echo "$runtime_violations" | sed 's/^/- /' >&2
  fi

  exit 1
fi

echo "✓ Alcance correcto: solo apps/payroll y frontend sin integraciones reales"
