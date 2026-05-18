import { pool } from "../db/pool.js";
import { badRequest, notFound } from "../utils/httpError.js";

const productTypeSelect = `
  id,
  name,
  code,
  category,
  description,
  is_active,
  created_at,
  updated_at
`;

function normalizeProductTypeInput(input) {
  const normalized = { ...input };

  if (Object.hasOwn(input, "code")) {
    normalized.code = input.code.trim().toUpperCase();
  }

  if (Object.hasOwn(input, "category")) {
    normalized.category = input.category.trim() || null;
  }

  if (Object.hasOwn(input, "description")) {
    normalized.description = input.description.trim() || null;
  }

  return normalized;
}

export async function listProductTypes({ includeInactive = false } = {}) {
  const result = await pool.query(
    `
      SELECT ${productTypeSelect}
      FROM product_types
      WHERE ($1::boolean = true OR is_active = true)
      ORDER BY is_active DESC, name ASC
    `,
    [includeInactive]
  );

  return result.rows;
}

export async function getProductTypeById(id, { includeInactive = false } = {}) {
  const result = await pool.query(
    `
      SELECT ${productTypeSelect}
      FROM product_types
      WHERE id = $1 AND ($2::boolean = true OR is_active = true)
      LIMIT 1
    `,
    [id, includeInactive]
  );

  if (!result.rows[0]) {
    throw notFound("Product type not found.");
  }

  return result.rows[0];
}

export async function createProductType(input) {
  const productType = normalizeProductTypeInput(input);

  try {
    const result = await pool.query(
      `
        INSERT INTO product_types (name, code, category, description, is_active)
        VALUES ($1, $2, $3, $4, COALESCE($5, true))
        RETURNING ${productTypeSelect}
      `,
      [
        productType.name,
        productType.code,
        productType.category,
        productType.description,
        productType.is_active,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw badRequest("Product type code must be unique.");
    }

    throw error;
  }
}

export async function updateProductType(id, input) {
  const productType = normalizeProductTypeInput(input);
  const hasName = Object.hasOwn(productType, "name");
  const hasCode = Object.hasOwn(productType, "code");
  const hasCategory = Object.hasOwn(productType, "category");
  const hasDescription = Object.hasOwn(productType, "description");
  const hasIsActive = Object.hasOwn(productType, "is_active");

  try {
    const result = await pool.query(
      `
        UPDATE product_types
        SET
          name = CASE WHEN $2::boolean THEN $3 ELSE name END,
          code = CASE WHEN $4::boolean THEN $5 ELSE code END,
          category = CASE WHEN $6::boolean THEN $7 ELSE category END,
          description = CASE WHEN $8::boolean THEN $9 ELSE description END,
          is_active = CASE WHEN $10::boolean THEN $11 ELSE is_active END
        WHERE id = $1
        RETURNING ${productTypeSelect}
      `,
      [
        id,
        hasName,
        productType.name,
        hasCode,
        productType.code,
        hasCategory,
        productType.category,
        hasDescription,
        productType.description,
        hasIsActive,
        productType.is_active,
      ]
    );

    if (!result.rows[0]) {
      throw notFound("Product type not found.");
    }

    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw badRequest("Product type code must be unique.");
    }

    throw error;
  }
}

export async function disableProductType(id) {
  const result = await pool.query(
    `
      UPDATE product_types
      SET is_active = false
      WHERE id = $1
      RETURNING ${productTypeSelect}
    `,
    [id]
  );

  if (!result.rows[0]) {
    throw notFound("Product type not found.");
  }

  return result.rows[0];
}
