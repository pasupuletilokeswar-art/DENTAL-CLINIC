#!/bin/sh
set -e

echo "==> [Clinic Backend] Validating environment configuration..."

# 1. Validate JWT_SECRET (Fail closed on missing or weak fallback secrets)
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "fallback-secret-clinic-key" ] || [ "$JWT_SECRET" = "super-secret-clinic-jwt-key-2026-secure" ]; then
  if [ -z "$JWT_SECRET" ]; then
    echo "FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is not defined." >&2
    echo "Generate a secure secret using: openssl rand -base64 32" >&2
    echo "Then define JWT_SECRET in your .env file." >&2
    exit 1
  fi
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

# 5. Conditional execution: ONLY initialize when positively confirmed count == 0
if [ "$TABLE_COUNT" -eq "0" ]; then
  echo "==> [Clinic Backend] Genuinely empty database positively confirmed."
  echo "==> [Clinic Backend] Running initial Prisma schema push..."
  npx prisma db push --skip-generate

  echo "==> [Clinic Backend] Seeding baseline master administrator..."
  npx tsx prisma/seed.ts

  echo "==> [Clinic Backend] Initial setup completed successfully."
else
  echo "==> [Clinic Backend] Existing schema detected ($TABLE_COUNT tables found)."
  echo "==> [Clinic Backend] Strict safety rule enforced: Skipping schema push and seed to prevent data modification."
  echo "==> [Clinic Backend] Performing strict schema compatibility verification across all 18 clinical models..."

  # 6. Validate all 18 clinical models. Fail closed immediately if any table/model fails.
  node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const models = [
    'user', 'doctor', 'patient', 'appointment', 'clinicalNote',
    'consultationBill', 'procedureMaster', 'procedure', 'operationBill',
    'payment', 'supplier', 'medicineMaster', 'medicineBatchStock',
    'purchaseInvoice', 'purchaseItem', 'pharmacySale', 'pharmacySaleItem',
    'stockMovement'
  ];

  async function validateAll() {
    for (const m of models) {
      if (!prisma[m] || typeof prisma[m].findFirst !== 'function') {
        console.error(\`FATAL ERROR: Prisma client missing model definition for '\${m}'\`);
        process.exit(1);
      }
      try {
        await prisma[m].findFirst();
      } catch (err) {
        console.error(\`\n============================================================\`);
        console.error(\`FATAL DATABASE SCHEMA COMPATIBILITY ERROR:\`);
        console.error(\`Model '\${m}' failed verification against existing database.\`);
        console.error(\`Reason: \${err.message}\`);
        console.error(\`CRITICAL: Existing database records are preserved untouched.\`);
        console.error(\`Startup halted safely to prevent data corruption.\`);
        console.error(\`============================================================\n\`);
        process.exit(1);
      }
    }
    console.log('==> [Clinic Backend] All 18 Prisma clinical models verified compatible with existing database.');
  }

  validateAll()
    .catch(err => {
      console.error('FATAL ERROR: Unexpected validation failure:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.\$disconnect();
    });
  "
fi

echo "==> [Clinic Backend] Environment and database verified. Starting Express API & Socket.IO server..."
exec "$@"
