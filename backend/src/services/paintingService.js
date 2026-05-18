import { pool } from "../db/pool.js";
import { notFound } from "../utils/httpError.js";

const paintingSelect = `
  pr.id,
  pr.manufactured_product_id,
  pr.painted_by,
  pr.paint_color,
  pr.paint_brand,
  pr.paint_batch_number,
  pr.coating_type,
  pr.painting_date,
  pr.painting_time,
  pr.painting_status,
  pr.repaint_required,
  pr.remarks,
  pr.created_by,
  creator.name AS created_by_name,
  pr.created_at,
  pr.updated_at
`;

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

function normalizePaintingInput(input) {
  return {
    ...input,
    painted_by: normalizeOptionalString(input.painted_by),
    paint_color: normalizeOptionalString(input.paint_color),
    paint_brand: normalizeOptionalString(input.paint_brand),
    paint_batch_number: normalizeOptionalString(input.paint_batch_number),
    coating_type: normalizeOptionalString(input.coating_type),
    remarks: normalizeOptionalString(input.remarks),
  };
}

async function assertProductExists(client, productId) {
  const result = await client.query(
    "SELECT id, current_status FROM manufactured_products WHERE id = $1 FOR UPDATE",
    [productId]
  );

  if (!result.rows[0]) {
    throw notFound("Product not found.");
  }

  return result.rows[0];
}

function nextProductStatusForPainting(paintingStatus, moveToStockAfterPainting) {
  if (paintingStatus !== "PAINTED") {
    return null;
  }

  return moveToStockAfterPainting ? "IN_STOCK" : "PAINTED";
}

async function addHistory(client, { productId, actionType, oldStatus, newStatus, description, userId }) {
  await client.query(
    `
      INSERT INTO product_history (
        manufactured_product_id,
        action_type,
        old_status,
        new_status,
        description,
        performed_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [productId, actionType, oldStatus, newStatus, description, userId]
  );
}

export async function listPaintingRecords(productId) {
  const productResult = await pool.query("SELECT id FROM manufactured_products WHERE id = $1 LIMIT 1", [productId]);

  if (!productResult.rows[0]) {
    throw notFound("Product not found.");
  }

  const result = await pool.query(
    `
      SELECT ${paintingSelect}
      FROM painting_records pr
      LEFT JOIN users creator ON creator.id = pr.created_by
      WHERE pr.manufactured_product_id = $1
      ORDER BY pr.created_at DESC
    `,
    [productId]
  );

  return result.rows;
}

export async function addPaintingRecord(productId, input, userId) {
  const painting = normalizePaintingInput(input);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const product = await assertProductExists(client, productId);
    const insertResult = await client.query(
      `
        INSERT INTO painting_records (
          manufactured_product_id,
          painted_by,
          paint_color,
          paint_brand,
          paint_batch_number,
          coating_type,
          painting_date,
          painting_time,
          painting_status,
          repaint_required,
          remarks,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::painting_status, 'PENDING'), COALESCE($10, false), $11, $12)
        RETURNING id
      `,
      [
        productId,
        painting.painted_by,
        painting.paint_color,
        painting.paint_brand,
        painting.paint_batch_number,
        painting.coating_type,
        painting.painting_date || null,
        painting.painting_time || null,
        painting.painting_status,
        painting.repaint_required,
        painting.remarks,
        userId,
      ]
    );

    await addHistory(client, {
      productId,
      actionType: "PAINTING_ADDED",
      oldStatus: product.current_status,
      newStatus: product.current_status,
      description: `Painting record added with status ${painting.painting_status ?? "PENDING"}`,
      userId,
    });

    const nextProductStatus = nextProductStatusForPainting(
      painting.painting_status,
      painting.move_to_stock_after_painting
    );

    if (nextProductStatus && nextProductStatus !== product.current_status) {
      await client.query("UPDATE manufactured_products SET current_status = $2 WHERE id = $1", [
        productId,
        nextProductStatus,
      ]);

      await addHistory(client, {
        productId,
        actionType: "PAINTING_STATUS_CHANGE",
        oldStatus: product.current_status,
        newStatus: nextProductStatus,
        description:
          nextProductStatus === "IN_STOCK"
            ? "Painting completed and product moved to stock"
            : "Painting completed and product marked as painted",
        userId,
      });
    }

    await client.query("COMMIT");

    const records = await listPaintingRecords(productId);
    return records.find((record) => record.id === insertResult.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePaintingRecord(productId, paintingRecordId, input, userId) {
  const painting = normalizePaintingInput(input);
  const hasPaintedBy = Object.hasOwn(input, "painted_by");
  const hasPaintColor = Object.hasOwn(input, "paint_color");
  const hasPaintBrand = Object.hasOwn(input, "paint_brand");
  const hasPaintBatchNumber = Object.hasOwn(input, "paint_batch_number");
  const hasCoatingType = Object.hasOwn(input, "coating_type");
  const hasPaintingDate = Object.hasOwn(input, "painting_date");
  const hasPaintingTime = Object.hasOwn(input, "painting_time");
  const hasPaintingStatus = Object.hasOwn(input, "painting_status");
  const hasRepaintRequired = Object.hasOwn(input, "repaint_required");
  const hasRemarks = Object.hasOwn(input, "remarks");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const product = await assertProductExists(client, productId);
    const existingResult = await client.query(
      `
        SELECT id, painting_status
        FROM painting_records
        WHERE id = $1 AND manufactured_product_id = $2
        FOR UPDATE
      `,
      [paintingRecordId, productId]
    );

    if (!existingResult.rows[0]) {
      throw notFound("Painting record not found.");
    }

    const updateResult = await client.query(
      `
        UPDATE painting_records
        SET
          painted_by = CASE WHEN $3::boolean THEN $4 ELSE painted_by END,
          paint_color = CASE WHEN $5::boolean THEN $6 ELSE paint_color END,
          paint_brand = CASE WHEN $7::boolean THEN $8 ELSE paint_brand END,
          paint_batch_number = CASE WHEN $9::boolean THEN $10 ELSE paint_batch_number END,
          coating_type = CASE WHEN $11::boolean THEN $12 ELSE coating_type END,
          painting_date = CASE WHEN $13::boolean THEN $14::date ELSE painting_date END,
          painting_time = CASE WHEN $15::boolean THEN $16::time ELSE painting_time END,
          painting_status = CASE WHEN $17::boolean THEN $18::painting_status ELSE painting_status END,
          repaint_required = CASE WHEN $19::boolean THEN $20 ELSE repaint_required END,
          remarks = CASE WHEN $21::boolean THEN $22 ELSE remarks END
        WHERE id = $1 AND manufactured_product_id = $2
        RETURNING id, painting_status
      `,
      [
        paintingRecordId,
        productId,
        hasPaintedBy,
        painting.painted_by,
        hasPaintColor,
        painting.paint_color,
        hasPaintBrand,
        painting.paint_brand,
        hasPaintBatchNumber,
        painting.paint_batch_number,
        hasCoatingType,
        painting.coating_type,
        hasPaintingDate,
        painting.painting_date || null,
        hasPaintingTime,
        painting.painting_time || null,
        hasPaintingStatus,
        painting.painting_status,
        hasRepaintRequired,
        painting.repaint_required,
        hasRemarks,
        painting.remarks,
      ]
    );

    const updatedPaintingStatus = updateResult.rows[0].painting_status;

    await addHistory(client, {
      productId,
      actionType: "PAINTING_UPDATED",
      oldStatus: product.current_status,
      newStatus: product.current_status,
      description: `Painting record updated with status ${updatedPaintingStatus}`,
      userId,
    });

    const paintingStatusChanged = existingResult.rows[0].painting_status !== updatedPaintingStatus;
    const nextProductStatus = nextProductStatusForPainting(
      updatedPaintingStatus,
      painting.move_to_stock_after_painting
    );

    if (paintingStatusChanged) {
      await addHistory(client, {
        productId,
        actionType: "PAINTING_RECORD_STATUS_CHANGE",
        oldStatus: product.current_status,
        newStatus: product.current_status,
        description: `Painting status changed from ${existingResult.rows[0].painting_status} to ${updatedPaintingStatus}`,
        userId,
      });
    }

    if (nextProductStatus && nextProductStatus !== product.current_status) {
      await client.query("UPDATE manufactured_products SET current_status = $2 WHERE id = $1", [
        productId,
        nextProductStatus,
      ]);

      await addHistory(client, {
        productId,
        actionType: "PAINTING_STATUS_CHANGE",
        oldStatus: product.current_status,
        newStatus: nextProductStatus,
        description:
          nextProductStatus === "IN_STOCK"
            ? "Painting completed and product moved to stock"
            : "Painting completed and product marked as painted",
        userId,
      });
    }

    await client.query("COMMIT");

    const records = await listPaintingRecords(productId);
    return records.find((record) => record.id === paintingRecordId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
