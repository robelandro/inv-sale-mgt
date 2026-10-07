#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
until bun run -e "
import postgres from 'postgres';
const client = postgres(process.env.DATABASE_URL, { timeout: 2 });
try {
  await client\`SELECT 1\`;
  process.exit(0);
} catch (e) {
  process.exit(1);
}
" 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping 2s"
  sleep 2
done

echo "Running migrations..."
bun run db:migrate || true

echo "Running seed..."
bun run db:seed || true

echo "Starting Next.js..."
exec bun run start
