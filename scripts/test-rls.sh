#!/usr/bin/env bash
# Runs the SQL migrations and RLS tests against a throwaway Postgres container.
set -eu

IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
CONTAINER="${POSTGRES_CONTAINER:-oblee-rls-test}"
PORT="${POSTGRES_PORT:-55432}"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=oblee -e POSTGRES_DB=oblee \
  -p "$PORT:5432" "$IMAGE" postgres -c check_function_bodies=off >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" psql -U postgres -d oblee -tAc 'select 1' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

psql_run() {
  docker exec -i -e PGPASSWORD=oblee "$CONTAINER" \
    psql -v ON_ERROR_STOP=1 -q -U postgres -d oblee
}

psql_run < supabase/tests/harness.sql
for migration in supabase/migrations/*.sql; do
  echo "applying $migration"
  psql_run < "$migration"
done
for suite in supabase/tests/rls_*.sql; do
  echo "running $suite"
  psql_run < "$suite"
done
