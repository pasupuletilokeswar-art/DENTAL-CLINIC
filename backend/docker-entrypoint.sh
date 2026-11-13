#!/bin/sh
set -e

echo "==> [Clinic Backend] Validating environment configuration..."

# 1. Ensure JWT_SECRET is available (use default secure clinic key if not provided)
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="clinic_jwt_super_secure_key_2026_dental_ortho"
fi

# 2. Dynamically construct URL-safe DATABASE_URL if credentials are provided
if [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_USER" ]; then
  SAFE_DATABASE_URL=$(node -e "
    const user = encodeURIComponent(process.env.POSTGRES_USER || 'postgres');
    const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD || '');
    const host = process.env.POSTGRES_HOST || 'postgres';
    const port = process.env.POSTGRES_PORT || '5432';
    const db = encodeURIComponent(process.env.POSTGRES_DB || 'clinic_db');
    process.stdout.write(\`postgresql://\${user}:\${pass}@\${host}:\${port}/\${db}?schema=public\`);
  ")

  if [ -n "$SAFE_DATABASE_URL" ]; then
    export DATABASE_URL="$SAFE_DATABASE_URL"
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "FATAL CONFIGURATION ERROR: DATABASE_URL could not be determined." >&2
  exit 1
fi

export DATABASE_URL

# Log sanitized connection target (NEVER print passwords or full URL)
TARGET_HOST="${POSTGRES_HOST:-postgres}"
TARGET_PORT="${POSTGRES_PORT:-5432}"
TARGET_DB="${POSTGRES_DB:-clinic_db}"
TARGET_USER="${POSTGRES_USER:-postgres}"
echo "==> [Clinic Backend] Connecting to PostgreSQL at ${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB} as user '${TARGET_USER}'..."

# 3. Wait for PostgreSQL connection (Fail closed after 30 attempts)
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function waitForDb(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.\$queryRaw\`SELECT 1\`;
      process.exit(0);
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.error('FATAL: PostgreSQL database connection timed out after 30 attempts.');
  process.exit(1);
}
waitForDb();
"

# 4. Inspect PostgreSQL catalog (Fail closed on any query or inspection failure)
echo "==> [Clinic Backend] Inspecting database catalog for existing tables..."
TABLE_COUNT_RAW=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function inspectCatalog() {
  try {
    const res = await prisma.\$queryRaw\`SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'\`;
    if (!res || !Array.isArray(res) || res.length === 0 || typeof res[0].count !== 'number') {
      console.error('FATAL: Unexpected query result from information_schema.tables');
      process.exit(1);
    }
    process.stdout.write(String(res[0].count));
  } catch (err) {
    console.error('FATAL DATABASE INSPECTION ERROR: Failed to query PostgreSQL catalog:', err.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}
inspectCatalog();
")

# If node inspection failed, TABLE_COUNT_RAW is empty and set -e will halt, but we explicitly verify:
if [ -z "$TABLE_COUNT_RAW" ]; then
  echo "FATAL: Database catalog inspection failed. Halting startup to prevent accidental data modification." >&2
  exit 1
fi

TABLE_COUNT="$TABLE_COUNT_RAW"
echo "==> [Clinic Backend] Public schema base table count: $TABLE_COUNT"

# 5. Schema synchronization and setup
if [ "$TABLE_COUNT" -eq "0" ]; then
  echo "==> [Clinic Backend] Empty database confirmed. Running initial Prisma schema push..."
  npx prisma db push --skip-generate

  echo "==> [Clinic Backend] Seeding baseline master administrator..."
  npx tsx prisma/seed.ts

  echo "==> [Clinic Backend] Initial setup completed successfully."
else
  echo "==> [Clinic Backend] Existing schema detected ($TABLE_COUNT tables found)."
  echo "==> [Clinic Backend] Automatically synchronizing database schema..."
  npx prisma db push --skip-generate
  echo "==> [Clinic Backend] Database schema synchronized successfully."
fi

echo "==> [Clinic Backend] Environment and database verified. Starting Express API & Socket.IO server..."
exec "$@"
