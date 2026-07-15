import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/moving_out_test",
  });
}

export async function cleanDatabase() {
  const pool = getPool();
  await pool.query(`
    TRUNCATE TABLE
      "Photo", "Item", "Box", "Room", "BoxSize", "StorageUnit",
      "Account", "VerificationToken", "User"
    RESTART IDENTITY CASCADE
  `);
  await pool.end();
}
