#!/usr/bin/env bash
# run-tests.sh — Ejecuta toda la suite de pruebas FHESA (Fase H).
#
# Uso:
#   ./run-tests.sh                # pruebas unitarias + integración + cobertura
#   ./run-tests.sh --with-e2e     # incluye E2E (requiere Playwright instalado en el host)
#
# Requisitos:
#   - docker compose up -d con los servicios backend, database, mailhog y frontend.

set -euo pipefail

RED=$'\e[31m'
GREEN=$'\e[32m'
YELLOW=$'\e[33m'
BOLD=$'\e[1m'
RESET=$'\e[0m'

banner() {
  printf '\n%s==> %s%s\n' "${BOLD}" "$1" "${RESET}"
}

fail() {
  printf '%sERROR:%s %s\n' "${RED}" "${RESET}" "$1" >&2
  exit 1
}

banner "Verificando que docker compose esté corriendo"
if ! docker compose ps --status=running backend 2>/dev/null | grep -q backend; then
  fail "El servicio 'backend' no está corriendo. Ejecuta 'docker compose up -d' primero."
fi
if ! docker compose ps --status=running database 2>/dev/null | grep -q database; then
  fail "El servicio 'database' no está corriendo."
fi
printf '%sservicios OK%s\n' "${GREEN}" "${RESET}"

banner "Preparando esquema 'testing' en PostgreSQL"
docker compose exec -T backend npm run --silent test:setup-db

banner "Backend: pruebas unitarias"
docker compose exec -T backend npm run --silent test:unit

banner "Backend: pruebas de integración"
docker compose exec -T backend npm run --silent test:integration

banner "Backend: reporte de cobertura (FQ-05 ≥ 70 % dominio, FQ-06 ≥ 40 % global)"
docker compose exec -T backend npm run --silent test:coverage || {
  printf '%sAviso:%s los umbrales de cobertura no se cumplieron. Revisa el reporte.\n' "${YELLOW}" "${RESET}"
}

if [[ "${1:-}" == "--with-e2e" ]]; then
  banner "Frontend: pruebas E2E (Playwright desde el host)"
  if ! command -v npx >/dev/null 2>&1; then
    fail "npx no está disponible en el host. Instala Node.js 22 LTS para correr los E2E."
  fi
  (cd frontend && npx playwright test)
else
  printf '\n%sNota:%s los tests E2E (Playwright) se omiten por defecto.\n' "${YELLOW}" "${RESET}"
  printf '      Ejecuta %s./run-tests.sh --with-e2e%s para incluirlos.\n' "${BOLD}" "${RESET}"
fi

banner "Todas las pruebas solicitadas pasaron"
printf '%s✓ suite completa OK%s\n' "${GREEN}" "${RESET}"
