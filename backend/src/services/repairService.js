import { pool } from "../db/pool.js";
import { badRequest, notFound } from "../utils/httpError.js";

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

function buildServiceInvoiceNumber() {
  const stamp = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MM-SVC-${stamp}-${suffix}`;
}

export async function listRepairJobs(filters = {}) {
  const where = [];
  const values = [];

  if (filters.repair_status) {
    values.push(filters.repair_status);
    where.push(`repair_status = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search.trim()}%`);
    where.push(
      `(service_invoice_number ILIKE $${values.length} OR customer_name ILIKE $${values.length} OR customer_phone ILIKE $${values.length} OR product_type ILIKE $${values.length} OR brand ILIKE $${values.length} OR model ILIKE $${values.length})`
    );
  }

  const result = await pool.query(
    `
      SELECT rj.*, creator.name AS created_by_name
      FROM repair_jobs rj
      LEFT JOIN users creator ON creator.id = rj.created_by
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY rj.created_at DESC
    `,
    values
  );

  return result.rows;
}

export async function getRepairJobById(id) {
  const result = await pool.query(
    `
      SELECT rj.*, creator.name AS created_by_name
      FROM repair_jobs rj
      LEFT JOIN users creator ON creator.id = rj.created_by
      WHERE rj.id = $1
      LIMIT 1
    `,
    [id]
  );

  if (!result.rows[0]) {
    throw notFound("Repair job not found.");
  }

  return result.rows[0];
}

export async function createRepairJob(input, userId) {
  const invoiceNumber = buildServiceInvoiceNumber();

  try {
    const result = await pool.query(
      `
        INSERT INTO repair_jobs (
          service_invoice_number,
          product_type,
          product_category,
          brand,
          model,
          product_condition,
          service_description,
          problem_reported,
          estimated_duration,
          customer_name,
          customer_location,
          customer_phone,
          service_start_date,
          expected_delivery_date,
          service_charge,
          repair_status,
          remarks,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13::date, CURRENT_DATE), $14, COALESCE($15, 0), COALESCE($16::repair_status, 'RECEIVED'), $17, $18)
        RETURNING id
      `,
      [
        invoiceNumber,
        input.product_type,
        normalizeOptionalString(input.product_category),
        normalizeOptionalString(input.brand),
        normalizeOptionalString(input.model),
        normalizeOptionalString(input.product_condition),
        input.service_description,
        normalizeOptionalString(input.problem_reported),
        normalizeOptionalString(input.estimated_duration),
        input.customer_name,
        normalizeOptionalString(input.customer_location),
        normalizeOptionalString(input.customer_phone),
        input.service_start_date || null,
        input.expected_delivery_date || null,
        input.service_charge ?? 0,
        input.repair_status,
        normalizeOptionalString(input.remarks),
        userId,
      ]
    );

    return getRepairJobById(result.rows[0].id);
  } catch (error) {
    if (error.code === "23505") {
      throw badRequest("Service invoice number conflict. Please try again.");
    }

    throw error;
  }
}

export async function updateRepairStatus(id, repairStatus) {
  const result = await pool.query(
    `
      UPDATE repair_jobs
      SET repair_status = $2
      WHERE id = $1
      RETURNING id
    `,
    [id, repairStatus]
  );

  if (!result.rows[0]) {
    throw notFound("Repair job not found.");
  }

  return getRepairJobById(id);
}
