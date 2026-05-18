import "../config/env.js";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const placeholderHash = "PLACEHOLDER_PASSWORD_HASH_REPLACE_BEFORE_USE";

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function validatePassword(password) {
  if (password.length < 10) {
    throw new Error("FACTORYTRACK_ADMIN_PASSWORD must be at least 10 characters.");
  }
}

async function createFirstAdmin() {
  const name = process.env.FACTORYTRACK_ADMIN_NAME?.trim() || "MetalMint Admin";
  const email = requireEnv("FACTORYTRACK_ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("FACTORYTRACK_ADMIN_PASSWORD");

  validatePassword(password);

  const existingAdmin = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' AND password_hash <> $1 LIMIT 1",
    [placeholderHash]
  );

  if (existingAdmin.rows[0]) {
    console.log("An admin user already exists. No changes were made.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, saltRounds);

  const placeholderAdmin = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' AND password_hash = $1 LIMIT 1",
    [placeholderHash]
  );

  if (placeholderAdmin.rows[0]) {
    await pool.query(
      `
        UPDATE users
        SET
          name = $2,
          email = $3,
          password_hash = $4,
          role = 'admin',
          is_active = true
        WHERE id = $1
      `,
      [placeholderAdmin.rows[0].id, name, email, passwordHash]
    );

    console.log(`Placeholder admin was replaced: ${email}`);
    return;
  }

  await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, 'admin', true)
      ON CONFLICT (email) DO UPDATE
      SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        is_active = true
    `,
    [name, email, passwordHash]
  );

  console.log(`Admin user is ready: ${email}`);
}

try {
  await createFirstAdmin();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
