#!/bin/bash
# Push DB schema changes from dev to prod
# Usage: bash scripts/db-push-prod.sh

set -e

# The prod DB password lives in .env.local (gitignored) or the environment —
# never hardcode it here: this file is committed.
if [ -z "$PROD_DB_PASSWORD" ] && [ -f .env.local ]; then
  PROD_DB_PASSWORD=$(grep -E '^PROD_DB_PASSWORD=' .env.local | head -1 | cut -d= -f2-)
fi
if [ -z "$PROD_DB_PASSWORD" ]; then
  echo "❌ PROD_DB_PASSWORD is not set. Add it to .env.local or export it before running." >&2
  exit 1
fi

PROD_DB_URL="postgresql://postgres:${PROD_DB_PASSWORD}@db.mikxrneopcwuldmykswq.supabase.co:5432/postgres"

echo "📋 Generating diff between dev and prod baseline..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_sync.sql"

# Generate diff (dev linked DB vs local migrations = what's new in dev)
DIFF=$(supabase db diff --linked 2>/dev/null)

if [ -z "$DIFF" ]; then
  echo "✅ No schema changes to push — dev and prod are in sync."
  exit 0
fi

echo "$DIFF" > "$MIGRATION_FILE"
LINES=$(wc -l < "$MIGRATION_FILE")
echo "📄 Migration saved: $MIGRATION_FILE ($LINES lines)"
echo ""
echo "=== Changes preview ==="
grep -E "create table|alter table|CREATE OR REPLACE|create policy|drop " "$MIGRATION_FILE" || echo "(only permission/grant changes)"
echo "========================"
echo ""

read -p "Push to prod? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "❌ Cancelled. Migration file kept at: $MIGRATION_FILE"
  exit 0
fi

echo "🚀 Pushing to prod..."
echo "Y" | supabase db push --db-url "$PROD_DB_URL" 2>&1

echo "✅ Done! Prod schema updated."
