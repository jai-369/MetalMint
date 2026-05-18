import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";
import { badRequest, notFound } from "../utils/httpError.js";

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

const publicUserSelect = `
  id,
  name,
  email,
  role,
  is_active,
  created_at,
  updated_at
`;

export function toPublicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findUserByEmailWithPassword(email) {
  const result = await pool.query(
    `
      SELECT id, name, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function findActiveUserById(id) {
  const result = await pool.query(
    `
      SELECT ${publicUserSelect}
      FROM users
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `,
    [id]
  );

  return toPublicUser(result.rows[0]);
}

export async function listUsers() {
  const result = await pool.query(
    `
      SELECT ${publicUserSelect}
      FROM users
      ORDER BY created_at DESC
    `
  );

  return result.rows.map(toPublicUser);
}

async function getUserForAdminGuard(id) {
  const result = await pool.query(
    `
      SELECT id, role, is_active
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  if (!result.rows[0]) {
    throw notFound("User not found.");
  }

  return result.rows[0];
}

async function assertNotLastActiveAdmin(user) {
  if (user.role !== "admin" || !user.is_active) {
    return;
  }

  const result = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND is_active = true");

  if (result.rows[0].count <= 1) {
    throw badRequest("At least one active admin user is required.");
  }
}

export async function createUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, saltRounds);

  try {
    const result = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, lower($2), $3, $4)
        RETURNING ${publicUserSelect}
      `,
      [name, email, passwordHash, role]
    );

    return toPublicUser(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw badRequest("A user with this email already exists.");
    }

    throw error;
  }
}

export async function updateUser(id, { name, email, role, is_active }) {
  const currentUser = await getUserForAdminGuard(id);
  const wouldRemoveAdminAccess =
    currentUser.role === "admin" &&
    currentUser.is_active &&
    ((role && role !== "admin") || is_active === false);

  if (wouldRemoveAdminAccess) {
    await assertNotLastActiveAdmin(currentUser);
  }

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          name = COALESCE($2, name),
          email = COALESCE(lower($3), email),
          role = COALESCE($4, role),
          is_active = COALESCE($5, is_active)
        WHERE id = $1
        RETURNING ${publicUserSelect}
      `,
      [id, name, email, role, is_active]
    );

    if (!result.rows[0]) {
      throw notFound("User not found.");
    }

    return toPublicUser(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw badRequest("A user with this email already exists.");
    }

    throw error;
  }
}

export async function resetUserPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const result = await pool.query(
    `
      UPDATE users
      SET password_hash = $2
      WHERE id = $1
      RETURNING ${publicUserSelect}
    `,
    [id, passwordHash]
  );

  if (!result.rows[0]) {
    throw notFound("User not found.");
  }

  return toPublicUser(result.rows[0]);
}

export async function setUserActiveState(id, isActive) {
  const currentUser = await getUserForAdminGuard(id);

  if (isActive === false) {
    await assertNotLastActiveAdmin(currentUser);
  }

  const result = await pool.query(
    `
      UPDATE users
      SET is_active = $2
      WHERE id = $1
      RETURNING ${publicUserSelect}
    `,
    [id, isActive]
  );

  if (!result.rows[0]) {
    throw notFound("User not found.");
  }

  return toPublicUser(result.rows[0]);
}

export async function deleteUser(id) {
  const currentUser = await getUserForAdminGuard(id);
  await assertNotLastActiveAdmin(currentUser);

  const result = await pool.query(
    `
      DELETE FROM users
      WHERE id = $1
      RETURNING ${publicUserSelect}
    `,
    [id]
  );

  if (!result.rows[0]) {
    throw notFound("User not found.");
  }

  return toPublicUser(result.rows[0]);
}
