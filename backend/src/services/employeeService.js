import { pool } from "../db/pool.js";
import { badRequest } from "../utils/httpError.js";

export async function listEmployees() {
  const result = await pool.query(
    "SELECT id, name, role, is_active, created_at FROM employees ORDER BY role ASC, name ASC"
  );
  return result.rows;
}

export async function createEmployee(name, role) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw badRequest("Employee name is required.");
  }
  if (!["fabricator", "painter", "helper", "supervisor"].includes(role)) {
    throw badRequest("Invalid employee role.");
  }

  const result = await pool.query(
    "INSERT INTO employees (name, role) VALUES ($1, $2) RETURNING id, name, role, is_active, created_at",
    [trimmedName, role]
  );
  return result.rows[0];
}

export async function updateEmployee(id, name, role, isActive) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw badRequest("Employee name is required.");
  }
  if (!["fabricator", "painter", "helper", "supervisor"].includes(role)) {
    throw badRequest("Invalid employee role.");
  }

  const result = await pool.query(
    "UPDATE employees SET name = $2, role = $3, is_active = $4 WHERE id = $1 RETURNING id, name, role, is_active, created_at",
    [id, trimmedName, role, !!isActive]
  );
  return result.rows[0];
}
