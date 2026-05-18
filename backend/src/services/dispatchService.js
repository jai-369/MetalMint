import { pool } from "../db/pool.js";
import { notFound } from "../utils/httpError.js";

const dispatchSelect = `
  dr.id,
  dr.manufactured_product_id,
  dr.customer_name,
  dr.customer_mobile,
  dr.invoice_number,
  dr.sale_price,
  dr.dispatch_date,
  dr.delivery_location,
  dr.transport_details,
  dr.vehicle_number,
  dr.remarks,
  dr.created_by,
  creator.name AS created_by_name,
  dr.created_at,
  dr.updated_at
`;

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

function normalizeDispatchInput(input) {
  return {
    ...input,
    customer_name: normalizeOptionalString(input.customer_name),
    customer_mobile: normalizeOptionalString(input.customer_mobile),
    invoice_number: normalizeOptionalString(input.invoice_number),
    delivery_location: normalizeOptionalString(input.delivery_location),
    transport_details: normalizeOptionalString(input.transport_details),
    vehicle_number: normalizeOptionalString(input.vehicle_number),
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

export async function listDispatchRecords(productId) {
  const productResult = await pool.query("SELECT id FROM manufactured_products WHERE id = $1 LIMIT 1", [productId]);

  if (!productResult.rows[0]) {
    throw notFound("Product not found.");
  }

  const result = await pool.query(
    `
      SELECT ${dispatchSelect}
      FROM dispatch_records dr
      LEFT JOIN users creator ON creator.id = dr.created_by
      WHERE dr.manufactured_product_id = $1
      ORDER BY dr.created_at DESC
    `,
    [productId]
  );

  return result.rows;
}

export async function addDispatchRecord(productId, input, userId) {
  const dispatch = normalizeDispatchInput(input);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const product = await assertProductExists(client, productId);
    const nextStatus = dispatch.mark_sold ? "SOLD" : "DISPATCHED";
    const insertResult = await client.query(
      `
        INSERT INTO dispatch_records (
          manufactured_product_id,
          customer_name,
          customer_mobile,
          invoice_number,
          sale_price,
          dispatch_date,
          delivery_location,
          transport_details,
          vehicle_number,
          remarks,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
      [
        productId,
        dispatch.customer_name,
        dispatch.customer_mobile,
        dispatch.invoice_number,
        dispatch.sale_price ?? null,
        dispatch.dispatch_date || null,
        dispatch.delivery_location,
        dispatch.transport_details,
        dispatch.vehicle_number,
        dispatch.remarks,
        userId,
      ]
    );

    await addHistory(client, {
      productId,
      actionType: "DISPATCH_ADDED",
      oldStatus: product.current_status,
      newStatus: product.current_status,
      description: `Dispatch record added${dispatch.invoice_number ? ` for invoice ${dispatch.invoice_number}` : ""}`,
      userId,
    });

    if (product.current_status !== nextStatus) {
      await client.query("UPDATE manufactured_products SET current_status = $2 WHERE id = $1", [
        productId,
        nextStatus,
      ]);

      await addHistory(client, {
        productId,
        actionType: "DISPATCH_STATUS_CHANGE",
        oldStatus: product.current_status,
        newStatus: nextStatus,
        description: nextStatus === "SOLD" ? "Product dispatched and marked sold" : "Product dispatched",
        userId,
      });
    }

    await client.query("COMMIT");

    const records = await listDispatchRecords(productId);
    return records.find((record) => record.id === insertResult.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateDispatchRecord(productId, dispatchRecordId, input, userId) {
  const dispatch = normalizeDispatchInput(input);
  const hasCustomerName = Object.hasOwn(dispatch, "customer_name");
  const hasCustomerMobile = Object.hasOwn(dispatch, "customer_mobile");
  const hasInvoiceNumber = Object.hasOwn(dispatch, "invoice_number");
  const hasSalePrice = Object.hasOwn(dispatch, "sale_price");
  const hasDispatchDate = Object.hasOwn(dispatch, "dispatch_date");
  const hasDeliveryLocation = Object.hasOwn(dispatch, "delivery_location");
  const hasTransportDetails = Object.hasOwn(dispatch, "transport_details");
  const hasVehicleNumber = Object.hasOwn(dispatch, "vehicle_number");
  const hasRemarks = Object.hasOwn(dispatch, "remarks");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const product = await assertProductExists(client, productId);
    const existingResult = await client.query(
      "SELECT id FROM dispatch_records WHERE id = $1 AND manufactured_product_id = $2 FOR UPDATE",
      [dispatchRecordId, productId]
    );

    if (!existingResult.rows[0]) {
      throw notFound("Dispatch record not found.");
    }

    await client.query(
      `
        UPDATE dispatch_records
        SET
          customer_name = CASE WHEN $3::boolean THEN $4 ELSE customer_name END,
          customer_mobile = CASE WHEN $5::boolean THEN $6 ELSE customer_mobile END,
          invoice_number = CASE WHEN $7::boolean THEN $8 ELSE invoice_number END,
          sale_price = CASE WHEN $9::boolean THEN $10 ELSE sale_price END,
          dispatch_date = CASE WHEN $11::boolean THEN $12::date ELSE dispatch_date END,
          delivery_location = CASE WHEN $13::boolean THEN $14 ELSE delivery_location END,
          transport_details = CASE WHEN $15::boolean THEN $16 ELSE transport_details END,
          vehicle_number = CASE WHEN $17::boolean THEN $18 ELSE vehicle_number END,
          remarks = CASE WHEN $19::boolean THEN $20 ELSE remarks END
        WHERE id = $1 AND manufactured_product_id = $2
      `,
      [
        dispatchRecordId,
        productId,
        hasCustomerName,
        dispatch.customer_name,
        hasCustomerMobile,
        dispatch.customer_mobile,
        hasInvoiceNumber,
        dispatch.invoice_number,
        hasSalePrice,
        dispatch.sale_price ?? null,
        hasDispatchDate,
        dispatch.dispatch_date || null,
        hasDeliveryLocation,
        dispatch.delivery_location,
        hasTransportDetails,
        dispatch.transport_details,
        hasVehicleNumber,
        dispatch.vehicle_number,
        hasRemarks,
        dispatch.remarks,
      ]
    );

    await addHistory(client, {
      productId,
      actionType: "DISPATCH_UPDATED",
      oldStatus: product.current_status,
      newStatus: product.current_status,
      description: "Dispatch record updated",
      userId,
    });

    if (dispatch.mark_sold && product.current_status !== "SOLD") {
      await client.query("UPDATE manufactured_products SET current_status = 'SOLD' WHERE id = $1", [productId]);

      await addHistory(client, {
        productId,
        actionType: "DISPATCH_STATUS_CHANGE",
        oldStatus: product.current_status,
        newStatus: "SOLD",
        description: "Product marked sold from dispatch",
        userId,
      });
    }

    await client.query("COMMIT");

    const records = await listDispatchRecords(productId);
    return records.find((record) => record.id === dispatchRecordId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
