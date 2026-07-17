try {
  require('dotenv').config();
} catch (e) {
  // Ignore in production where dotenv might not be loaded
}

let pgLib = null;
try {
  pgLib = require('pg');
} catch (e) {
  // pg is not installed yet (e.g. before npm install)
}

let pool = null;
let tableInitialized = false;

function getPool() {
  if (pool) return pool;

  if (!pgLib) {
    throw new Error("The 'pg' package is not installed yet. Please run 'npm install' to install dependencies.");
  }

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is missing.");
  }

  const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  pool = new pgLib.Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false }
  });

  return pool;
}

async function ensureTable() {
  if (tableInitialized) return;
  
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users_data (
      email VARCHAR(255) PRIMARY KEY,
      profile JSONB,
      accounts JSONB,
      categories JSONB,
      transactions JSONB,
      budgets JSONB,
      goals JSONB,
      bills JSONB,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  tableInitialized = true;
}

async function query(text, params) {
  getPool(); // Ensure pool is instantiated
  await ensureTable();
  return pool.query(text, params);
}

module.exports = {
  query,
  getPool
};
