#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FileVault — PostgreSQL server-side setup
# Run this script DIRECTLY on the Linux server at 192.168.86.128
# as root or with sudo.
#
#   sudo bash scripts/server-postgres-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DB_USER="filevault"
DB_PASS="filevault_secret"          # ← change this
DB_NAME="filevault"
ALLOWED_SUBNET="192.168.86.0/24"    # ← your LAN subnet

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✔  $*${NC}"; }
info() { echo -e "${YELLOW}  →  $*${NC}"; }
die()  { echo -e "${RED}  ✗  $*${NC}"; exit 1; }

echo ""
echo "════════════════════════════════════════════════════"
echo "   FileVault — PostgreSQL Bootstrap"
echo "   Target: $(hostname -I | awk '{print $1}')"
echo "════════════════════════════════════════════════════"
echo ""

# ── 1. Find PostgreSQL version and paths ──────────────────────────────────────
PG_VERSION=$(pg_lsclusters -h 2>/dev/null | awk '{print $1}' | head -1 || \
             psql --version 2>/dev/null | grep -oP '\d+' | head -1 || \
             echo "")

if [[ -z "$PG_VERSION" ]]; then
  die "PostgreSQL not found. Install it first: sudo apt install postgresql"
fi

PG_CONF_DIR=$(pg_lsclusters -h 2>/dev/null | awk '{print $6}' | head -1 || echo "/etc/postgresql/${PG_VERSION}/main")
PG_HBA="$PG_CONF_DIR/pg_hba.conf"
PG_MAIN="$PG_CONF_DIR/postgresql.conf"

info "PostgreSQL $PG_VERSION found"
info "Config dir: $PG_CONF_DIR"

# ── 2. Make PostgreSQL listen on all interfaces ──────────────────────────────
if grep -q "^listen_addresses" "$PG_MAIN" 2>/dev/null; then
  sed -i "s/^listen_addresses.*/listen_addresses = '*'/" "$PG_MAIN"
else
  echo "listen_addresses = '*'" >> "$PG_MAIN"
fi
ok "postgresql.conf: listen_addresses = '*'"

# ── 3. Allow filevault user from LAN subnet in pg_hba.conf ──────────────────
HBA_RULE="host    ${DB_NAME}    ${DB_USER}    ${ALLOWED_SUBNET}    scram-sha-256"
if ! grep -qF "$HBA_RULE" "$PG_HBA"; then
  # Insert before the first 'host' line so it gets evaluated first
  sed -i "/^host/i ${HBA_RULE}" "$PG_HBA"
fi
ok "pg_hba.conf: LAN access rule added"

# ── 4. Open port 5432 in UFW (if active) ─────────────────────────────────────
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow from "$ALLOWED_SUBNET" to any port 5432 proto tcp comment "FileVault Postgres" || true
  ok "UFW: port 5432 open for $ALLOWED_SUBNET"
else
  info "UFW not active — skipping firewall rule (add manually if needed)"
fi

# ── 5. Reload PostgreSQL config ───────────────────────────────────────────────
if command -v pg_lsclusters &>/dev/null; then
  pg_ctlcluster "$PG_VERSION" main reload
else
  systemctl reload postgresql
fi
ok "PostgreSQL config reloaded"

# ── 6. Create role and database ───────────────────────────────────────────────
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
-- Role
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'Created user ${DB_USER}';
  ELSE
    ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'Updated password for ${DB_USER}';
  END IF;
END
\$\$;

-- Database
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') \gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

ok "Role '${DB_USER}' and database '${DB_NAME}' ready"

# ── 7. Install PostgreSQL extensions ─────────────────────────────────────────
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
SQL

ok "Extensions installed: uuid-ossp, pg_trgm, btree_gin"

# ── 8. Verify connection from localhost ───────────────────────────────────────
PGPASSWORD="$DB_PASS" psql \
  -h 127.0.0.1 -p 5432 \
  -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT current_user, current_database(), version();" \
  && ok "Connection test passed" \
  || die "Connection test failed — check pg_hba.conf and password"

# ── 9. Print .env snippet ─────────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "════════════════════════════════════════════════════"
echo "  Setup complete! Add this to your .env:"
echo ""
echo "  DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${SERVER_IP}:5432/${DB_NAME}"
echo "════════════════════════════════════════════════════"
echo ""
