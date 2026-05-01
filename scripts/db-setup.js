/**
 * FileVault database bootstrap script.
 * Run as postgres superuser to create the filevault role, database, and extensions.
 *
 * Usage:
 *   PGPASSWORD=<superuser_pass> node scripts/db-setup.js \
 *     --host 192.168.86.128 --superuser postgres --superpass <pass> \
 *     --dbpass <filevault_user_password>
 */

const { Client } = require('pg');

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : (fallback ?? null);
}

const HOST      = arg('host',       '192.168.86.128');
const PORT      = parseInt(arg('port', '5432'));
const SUPERUSER = arg('superuser',  'postgres');
const SUPERPASS = arg('superpass',  process.env.PGPASSWORD ?? '');
const DB_USER   = arg('user',       'filevault');
const DB_PASS   = arg('dbpass',     'filevault_secret');
const DB_NAME   = arg('db',         'filevault');

async function run() {
  console.log(`\n Connecting to ${HOST}:${PORT} as ${SUPERUSER}…\n`);

  // ── Step 1: connect to default postgres DB as superuser ─────────────────
  const admin = new Client({
    host: HOST, port: PORT,
    user: SUPERUSER, password: SUPERPASS,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  });

  try {
    await admin.connect();
    console.log(' Connected.');
  } catch (err) {
    console.error(` Could not connect to ${HOST}:${PORT}`);
    console.error(` Error: ${err.message}`);
    console.error(`\n Checklist:`);
    console.error(`   1. PostgreSQL is running on ${HOST}`);
    console.error(`   2. postgresql.conf has: listen_addresses = '*'`);
    console.error(`   3. pg_hba.conf allows host connections from this machine`);
    console.error(`   4. Port 5432 is open in the server firewall`);
    process.exit(1);
  }

  // ── Step 2: create role if not exists ────────────────────────────────────
  const roleExists = await admin.query(
    `SELECT 1 FROM pg_roles WHERE rolname = $1`, [DB_USER]
  );
  if (roleExists.rows.length === 0) {
    await admin.query(
      `CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' CREATEDB`
    );
    console.log(` Created user: ${DB_USER}`);
  } else {
    await admin.query(`ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}'`);
    console.log(` User ${DB_USER} already exists — password updated.`);
  }

  // ── Step 3: create database if not exists ────────────────────────────────
  const dbExists = await admin.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]
  );
  if (dbExists.rows.length === 0) {
    await admin.query(`CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}`);
    console.log(` Created database: ${DB_NAME}`);
  } else {
    console.log(` Database ${DB_NAME} already exists.`);
  }

  await admin.query(`GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER}`);
  console.log(` Granted privileges on ${DB_NAME} to ${DB_USER}`);
  await admin.end();

  // ── Step 4: connect to the new DB and install extensions ─────────────────
  const db = new Client({
    host: HOST, port: PORT,
    user: SUPERUSER, password: SUPERPASS,
    database: DB_NAME,
    connectionTimeoutMillis: 5000,
  });
  await db.connect();

  const extensions = ['uuid-ossp', 'pg_trgm', 'btree_gin'];
  for (const ext of extensions) {
    await db.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
    console.log(` Extension installed: ${ext}`);
  }

  // ── Step 5: grant schema usage to filevault user ─────────────────────────
  await db.query(`GRANT ALL ON SCHEMA public TO ${DB_USER}`);
  await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER}`);
  await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER}`);
  console.log(` Schema privileges granted.`);

  await db.end();

  // ── Step 6: verify connection as filevault user ───────────────────────────
  const verify = new Client({
    host: HOST, port: PORT,
    user: DB_USER, password: DB_PASS,
    database: DB_NAME,
    connectionTimeoutMillis: 5000,
  });
  await verify.connect();
  const { rows } = await verify.query(`SELECT current_user, current_database(), version()`);
  await verify.end();

  console.log(`\n Verification OK:`);
  console.log(`   user     : ${rows[0].current_user}`);
  console.log(`   database : ${rows[0].current_database}`);
  console.log(`   postgres : ${rows[0].version.split(' ').slice(0,2).join(' ')}`);

  console.log(`\n Setup complete! Add this to your .env:\n`);
  console.log(`   DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${HOST}:${PORT}/${DB_NAME}\n`);
}

run().catch((err) => {
  console.error('\n Unexpected error:', err.message);
  process.exit(1);
});
