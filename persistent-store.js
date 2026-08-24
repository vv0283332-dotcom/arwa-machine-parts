import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

const cache = new Map();

export async function initPersistentStore(initialData = {}) {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not configured; using local JSON storage.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS arwa_store (
      store_key TEXT PRIMARY KEY,
      store_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const [key, fallback] of Object.entries(initialData)) {
    const result = await pool.query(
      `SELECT store_value FROM arwa_store WHERE store_key = $1`,
      [key]
    );

    if (result.rows.length) {
      cache.set(key, result.rows[0].store_value);
    } else {
      cache.set(key, fallback);

      await pool.query(
        `INSERT INTO arwa_store
          (store_key, store_value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (store_key) DO NOTHING`,
        [key, JSON.stringify(fallback)]
      );
    }
  }

  console.log("ARWA PostgreSQL storage ready.");
}

export function persistentRead(key, fallback = []) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  return fallback;
}

export async function persistentWrite(key, value) {
  cache.set(key, value);

  if (!process.env.DATABASE_URL) {
    return;
  }

  await pool.query(
    `INSERT INTO arwa_store
      (store_key, store_value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (store_key)
     DO UPDATE SET
       store_value = EXCLUDED.store_value,
       updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

export { pool };
