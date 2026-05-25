import { pool } from "../db/pool.js";
import { badRequest, notFound } from "../utils/httpError.js";

const defaultPaintColors = [
  { name: "Royal Blue", display_order: 10 },
  { name: "Slate Grey", display_order: 20 },
  { name: "Olive Green", display_order: 30 },
  { name: "Chocolate Brown", display_order: 40 },
  { name: "Standard Grey", display_order: 50 },
  { name: "Maroon Red", display_order: 60 },
  { name: "Pearly White", display_order: 70 },
];

let ensureSchemaPromise;

async function ensurePaintColorOptionsSchema() {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS paint_color_options (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(80) NOT NULL UNIQUE,
          display_order INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_paint_color_options_active_order
          ON paint_color_options(is_active, display_order, name);

        DROP TRIGGER IF EXISTS trg_paint_color_options_updated_at ON paint_color_options;
        CREATE TRIGGER trg_paint_color_options_updated_at
        BEFORE UPDATE ON paint_color_options
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      `);

      for (const color of defaultPaintColors) {
        await pool.query(
          `
            INSERT INTO paint_color_options (name, display_order, is_active)
            VALUES ($1, $2, true)
            ON CONFLICT (name) DO NOTHING
          `,
          [color.name, color.display_order]
        );
      }
    })().catch((error) => {
      ensureSchemaPromise = null;
      throw error;
    });
  }

  await ensureSchemaPromise;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

export async function listPaintColors({ includeInactive = false } = {}) {
  await ensurePaintColorOptionsSchema();

  const values = [];
  const whereClause = includeInactive ? "" : "WHERE is_active = true";

  const result = await pool.query(
    `
      SELECT id, name, display_order, is_active, created_at, updated_at
      FROM paint_color_options
      ${whereClause}
      ORDER BY is_active DESC, display_order ASC, name ASC
    `,
    values
  );

  return result.rows;
}

export async function getPaintColorById(id, { includeInactive = false } = {}) {
  await ensurePaintColorOptionsSchema();

  const result = await pool.query(
    `
      SELECT id, name, display_order, is_active, created_at, updated_at
      FROM paint_color_options
      WHERE id = $1
        AND ($2::boolean = true OR is_active = true)
      LIMIT 1
    `,
    [id, includeInactive]
  );

  if (!result.rows[0]) {
    throw notFound("Paint color not found.");
  }

  return result.rows[0];
}

export async function createPaintColor(input) {
  await ensurePaintColorOptionsSchema();

  try {
    const result = await pool.query(
      `
        INSERT INTO paint_color_options (name, display_order, is_active)
        VALUES ($1, $2, COALESCE($3, true))
        RETURNING id
      `,
      [input.name.trim(), normalizeOptionalNumber(input.display_order) ?? 0, input.is_active]
    );

    return getPaintColorById(result.rows[0].id, { includeInactive: true });
  } catch (error) {
    if (error.code === "23505") {
      throw badRequest("A paint color with this name already exists.");
    }

    throw error;
  }
}

export async function updatePaintColor(id, input) {
  await ensurePaintColorOptionsSchema();

  const hasName = Object.hasOwn(input, "name");
  const hasDisplayOrder = Object.hasOwn(input, "display_order");
  const hasIsActive = Object.hasOwn(input, "is_active");

  try {
    const result = await pool.query(
      `
        UPDATE paint_color_options
        SET
          name = CASE WHEN $2::boolean THEN $3 ELSE name END,
          display_order = CASE WHEN $4::boolean THEN $5 ELSE display_order END,
          is_active = CASE WHEN $6::boolean THEN $7 ELSE is_active END
        WHERE id = $1
        RETURNING id
      `,
      [
        id,
        hasName,
        normalizeOptionalString(input.name),
        hasDisplayOrder,
        normalizeOptionalNumber(input.display_order),
        hasIsActive,
        input.is_active,
      ]
    );

    if (!result.rows[0]) {
      throw notFound("Paint color not found.");
    }

    return getPaintColorById(id, { includeInactive: true });
  } catch (error) {
    if (error.code === "23505") {
      throw badRequest("A paint color with this name already exists.");
    }

    throw error;
  }
}

export async function disablePaintColor(id) {
  await ensurePaintColorOptionsSchema();

  const result = await pool.query(
    `
      UPDATE paint_color_options
      SET is_active = false
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  if (!result.rows[0]) {
    throw notFound("Paint color not found.");
  }

  return getPaintColorById(id, { includeInactive: true });
}
