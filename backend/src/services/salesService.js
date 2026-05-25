import { pool } from "../db/pool.js";
import { badRequest, notFound } from "../utils/httpError.js";
import { CODE_SCOPES, reserveDailyCode } from "../utils/shortCode.js";

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

function toNumber(value) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function addHistory(client, { productId, oldStatus, userId, invoiceNumber }) {
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
      VALUES ($1, 'SALE', $2, 'SOLD', $3, $4)
    `,
    [productId, oldStatus, `Product sold through invoice ${invoiceNumber}`, userId]
  );
}

export async function listSalesInvoices() {
  const result = await pool.query(
    `
      SELECT
        si.*,
        creator.name AS created_by_name,
        COUNT(sii.id)::int AS item_count
      FROM sales_invoices si
      LEFT JOIN users creator ON creator.id = si.created_by
      LEFT JOIN sales_invoice_items sii ON sii.sales_invoice_id = si.id
      GROUP BY si.id, creator.name
      ORDER BY si.created_at DESC
    `
  );

  return result.rows;
}

export async function getSalesInvoiceById(id) {
  const invoiceResult = await pool.query(
    `
      SELECT si.*, creator.name AS created_by_name
      FROM sales_invoices si
      LEFT JOIN users creator ON creator.id = si.created_by
      WHERE si.id = $1
      LIMIT 1
    `,
    [id]
  );

  if (!invoiceResult.rows[0]) {
    throw notFound("Sales invoice not found.");
  }

  const itemsResult = await pool.query(
    `
      SELECT *
      FROM sales_invoice_items
      WHERE sales_invoice_id = $1
      ORDER BY created_at ASC
    `,
    [id]
  );

  return {
    ...invoiceResult.rows[0],
    items: itemsResult.rows,
  };
}

export async function createSalesInvoice(input, userId) {
  const selectedItems = input.items ?? [];

  if (!selectedItems.length) {
    throw badRequest("Select at least one product for sale.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productIds = selectedItems.map((item) => item.manufactured_product_id);
    const productResult = await client.query(
      `
        SELECT
          mp.id,
          mp.product_code,
          mp.current_status,
          mp.size_label,
          mp.width,
          mp.height,
          pt.name AS product_type_name,
          pt.code AS product_type_code,
          latest_paint.paint_color
        FROM manufactured_products mp
        JOIN product_types pt ON pt.id = mp.product_type_id
        LEFT JOIN LATERAL (
          SELECT paint_color
          FROM painting_records pr
          WHERE pr.manufactured_product_id = mp.id
          ORDER BY pr.created_at DESC
          LIMIT 1
        ) latest_paint ON true
        WHERE mp.id = ANY($1::uuid[])
        FOR UPDATE OF mp
      `,
      [productIds]
    );

    if (productResult.rows.length !== productIds.length) {
      throw badRequest("One or more selected products were not found.");
    }

    const productById = new Map(productResult.rows.map((product) => [product.id, product]));
    const saleDate = input.sale_date || new Date();
    const invoiceNumber = await reserveDailyCode(client, {
      scope: CODE_SCOPES.SALES_INVOICE,
      dateValue: saleDate,
    });
    const lineItems = selectedItems.map((item) => {
      const product = productById.get(item.manufactured_product_id);

      if (product.current_status !== "IN_STOCK") {
        throw badRequest(`${product.product_code} is not currently in stock.`);
      }

      const quantity = Number(item.quantity ?? 1);
      const unitPrice = toNumber(item.unit_price);
      const discountAmount = toNumber(item.discount_amount);
      const lineTotal = Math.max(quantity * unitPrice - discountAmount, 0);

      return {
        product,
        quantity,
        unitPrice,
        discountAmount,
        lineTotal,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const itemDiscount = lineItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const invoiceDiscount = toNumber(input.discount_amount);
    const discountAmount = itemDiscount + invoiceDiscount;
    const totalAmount = Math.max(subtotal - discountAmount, 0);

    const invoiceResult = await client.query(
      `
        INSERT INTO sales_invoices (
          invoice_number,
          customer_name,
          customer_mobile,
          customer_location,
          sale_date,
          subtotal,
          discount_amount,
          total_amount,
          remarks,
          created_by
        )
        VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7, $8, $9, $10)
        RETURNING id
      `,
      [
        invoiceNumber,
        normalizeOptionalString(input.customer_name),
        normalizeOptionalString(input.customer_mobile),
        normalizeOptionalString(input.customer_location),
        input.sale_date || null,
        subtotal,
        discountAmount,
        totalAmount,
        normalizeOptionalString(input.remarks),
        userId,
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;

    for (const item of lineItems) {
      const sizeLabel =
        item.product.size_label || `${Number(item.product.width).toString()} x ${Number(item.product.height).toString()}`;

      await client.query(
        `
          INSERT INTO sales_invoice_items (
            sales_invoice_id,
            manufactured_product_id,
            product_code,
            product_type_name,
            product_type_code,
            size_label,
            paint_color,
            quantity,
            unit_price,
            discount_amount,
            line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'Unpainted'), $8, $9, $10, $11)
        `,
        [
          invoiceId,
          item.product.id,
          item.product.product_code,
          item.product.product_type_name,
          item.product.product_type_code,
          sizeLabel,
          item.product.paint_color,
          item.quantity,
          item.unitPrice,
          item.discountAmount,
          item.lineTotal,
        ]
      );

      await client.query("UPDATE manufactured_products SET current_status = 'SOLD' WHERE id = $1", [item.product.id]);
      await addHistory(client, {
        productId: item.product.id,
        oldStatus: item.product.current_status,
        userId,
        invoiceNumber,
      });
    }

    await client.query("COMMIT");

    return getSalesInvoiceById(invoiceId);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw badRequest("Invoice number conflict. Please try again.");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSalesInvoice(id, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const invoiceResult = await client.query(
      `
        SELECT id, invoice_number
        FROM sales_invoices
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      throw notFound("Sales invoice not found.");
    }

    const itemsResult = await client.query(
      `
        SELECT DISTINCT
          mp.id,
          mp.product_code,
          mp.current_status
        FROM sales_invoice_items sii
        JOIN manufactured_products mp ON mp.id = sii.manufactured_product_id
        WHERE sii.sales_invoice_id = $1
        FOR UPDATE OF mp
      `,
      [id]
    );

    await client.query("DELETE FROM sales_invoices WHERE id = $1", [id]);

    for (const product of itemsResult.rows) {
      if (product.current_status !== "IN_STOCK") {
        await client.query("UPDATE manufactured_products SET current_status = 'IN_STOCK' WHERE id = $1", [product.id]);
      }

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
          VALUES ($1, 'SALE_DELETE', $2, 'IN_STOCK', $3, $4)
        `,
        [
          product.id,
          product.current_status,
          `Sales invoice ${invoice.invoice_number} deleted. Product returned to In Stock.`,
          userId,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      ...invoice,
      restored_products: itemsResult.rows,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
