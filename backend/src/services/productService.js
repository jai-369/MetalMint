import { pool } from "../db/pool.js";
import { badRequest, notFound } from "../utils/httpError.js";

const companyPrefix = (process.env.PRODUCT_CODE_PREFIX ?? "MM").trim().toUpperCase();

function getQrTargetUrl(productCode) {
  const qrPath = `/qr/${encodeURIComponent(productCode)}`;
  const appPublicUrl = process.env.APP_PUBLIC_URL?.trim();

  if (!appPublicUrl) {
    return qrPath;
  }

  return `${appPublicUrl.replace(/\/$/, "")}${qrPath}`;
}

function attachProductDerivedFields(product) {
  if (!product) {
    return product;
  }

  return {
    ...product,
    qr_url: getQrTargetUrl(product.product_code),
  };
}

const productSelect = `
  mp.id,
  mp.product_code,
  mp.product_type_id,
  pt.name AS product_type_name,
  pt.code AS product_type_code,
  pt.category AS product_type_category,
  mp.width,
  mp.height,
  mp.depth,
  mp.size_label,
  mp.material_gauge,
  mp.manufacturing_date,
  mp.manufacturing_batch,
  mp.manufactured_by,
  mp.factory_location,
  mp.current_status,
  mp.remarks,
  latest_paint.paint_color,
  latest_paint.painted_by,
  latest_paint.painting_status,
  latest_paint.painting_date,
  latest_dispatch.customer_name,
  latest_dispatch.customer_mobile,
  latest_dispatch.invoice_number,
  latest_dispatch.dispatch_date,
  mp.created_by,
  creator.name AS created_by_name,
  mp.created_at,
  mp.updated_at
`;

function normalizeOptionalString(value) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

function normalizeProductInput(input) {
  return {
    ...input,
    size_label: normalizeOptionalString(input.size_label),
    material_gauge: normalizeOptionalString(input.material_gauge),
    manufacturing_batch: normalizeOptionalString(input.manufacturing_batch),
    manufactured_by: normalizeOptionalString(input.manufactured_by),
    factory_location: normalizeOptionalString(input.factory_location),
    remarks: normalizeOptionalString(input.remarks),
  };
}

function dimensionToCode(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw badRequest("Width and height must be positive numbers.");
  }

  return numberValue.toFixed(2).replace(/\.?0+$/, "").replace(/\./g, "");
}

function getYearMonthCode(dateValue) {
  const match = String(dateValue).match(/^(\d{4})-(\d{2})-\d{2}$/);

  if (!match) {
    throw badRequest("Manufacturing date must use YYYY-MM-DD format.");
  }

  return `${match[1].slice(2)}${match[2]}`;
}

function buildSizeCode(width, height) {
  return `${dimensionToCode(width)}${dimensionToCode(height)}`;
}

async function getProductTypeForCreation(client, productTypeId) {
  const result = await client.query(
    `
      SELECT id, code, name
      FROM product_types
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `,
    [productTypeId]
  );

  if (!result.rows[0]) {
    throw badRequest("Select an active product type.");
  }

  return result.rows[0];
}

async function reserveSerial(client, { productTypeId, sizeCode, yearMonth }) {
  const result = await client.query(
    `
      INSERT INTO product_code_sequences (product_type_id, size_code, year_month, last_serial)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (product_type_id, size_code, year_month)
      DO UPDATE SET last_serial = product_code_sequences.last_serial + 1
      RETURNING last_serial
    `,
    [productTypeId, sizeCode, yearMonth]
  );

  return result.rows[0].last_serial;
}

function buildProductCode({ productTypeCode, sizeCode, yearMonth, serial }) {
  return `${companyPrefix}-${productTypeCode}-${sizeCode}-${yearMonth}-${String(serial).padStart(4, "0")}`;
}

function baseProductQuery(whereClause) {
  return `
    SELECT ${productSelect}
    FROM manufactured_products mp
    JOIN product_types pt ON pt.id = mp.product_type_id
    LEFT JOIN users creator ON creator.id = mp.created_by
    LEFT JOIN LATERAL (
      SELECT paint_color, painted_by, painting_status, painting_date
      FROM painting_records pr
      WHERE pr.manufactured_product_id = mp.id
      ORDER BY pr.created_at DESC
      LIMIT 1
    ) latest_paint ON true
    LEFT JOIN LATERAL (
      SELECT customer_name, customer_mobile, invoice_number, dispatch_date
      FROM dispatch_records dr
      WHERE dr.manufactured_product_id = mp.id
      ORDER BY dr.created_at DESC
      LIMIT 1
    ) latest_dispatch ON true
    ${whereClause}
  `;
}

export async function createManufacturedProduct(input, userId) {
  const product = normalizeProductInput(input);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productType = await getProductTypeForCreation(client, product.product_type_id);
    const sizeCode = buildSizeCode(product.width, product.height);
    const yearMonth = getYearMonthCode(product.manufacturing_date);
    const serial = await reserveSerial(client, {
      productTypeId: product.product_type_id,
      sizeCode,
      yearMonth,
    });
    const productCode = buildProductCode({
      productTypeCode: productType.code,
      sizeCode,
      yearMonth,
      serial,
    });

    const insertResult = await client.query(
      `
        INSERT INTO manufactured_products (
          product_code,
          product_type_id,
          width,
          height,
          depth,
          size_label,
          material_gauge,
          manufacturing_date,
          manufacturing_batch,
          manufactured_by,
          factory_location,
          current_status,
          remarks,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PAINTING_PENDING', $12, $13)
        RETURNING id
      `,
      [
        productCode,
        product.product_type_id,
        product.width,
        product.height,
        product.depth,
        product.size_label,
        product.material_gauge,
        product.manufacturing_date,
        product.manufacturing_batch,
        product.manufactured_by,
        product.factory_location,
        product.remarks,
        userId,
      ]
    );

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
        VALUES ($1, 'CREATE', NULL, 'PAINTING_PENDING', $2, $3)
      `,
      [
        insertResult.rows[0].id,
        "Product created and moved to Painting Pending",
        userId,
      ]
    );

    await client.query("COMMIT");

    return getManufacturedProductById(insertResult.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw badRequest("Generated product code already exists. Please try again.");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function listManufacturedProducts(filtersInput = {}) {
  const filters = [];
  const values = [];

  const {
    search,
    product_code: productCode,
    product_type_id: productTypeId,
    current_status: currentStatus,
    status,
    width,
    height,
    size_label: sizeLabel,
    paint_color: paintColor,
    manufacturing_batch: manufacturingBatch,
    manufactured_by: manufacturedBy,
    painted_by: paintedBy,
    manufacturing_date_from: manufacturingDateFrom,
    manufacturing_date_to: manufacturingDateTo,
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
    invoice_number: invoiceNumber,
    customer_mobile: customerMobile,
    customer_name: customerName,
    dispatch_date: dispatchDate,
  } = filtersInput;

  if (search) {
    values.push(`%${search.trim()}%`);
    filters.push(
      `(mp.product_code ILIKE $${values.length} OR mp.manufacturing_batch ILIKE $${values.length} OR latest_paint.paint_color ILIKE $${values.length})`
    );
  }

  if (productCode) {
    values.push(`${productCode.trim().toUpperCase()}%`);
    filters.push(`mp.product_code LIKE $${values.length}`);
  }

  if (currentStatus || status) {
    values.push(currentStatus ?? status);
    filters.push(`mp.current_status = $${values.length}`);
  }

  if (productTypeId) {
    values.push(productTypeId);
    filters.push(`mp.product_type_id = $${values.length}`);
  }

  if (width) {
    values.push(width);
    filters.push(`mp.width = $${values.length}`);
  }

  if (height) {
    values.push(height);
    filters.push(`mp.height = $${values.length}`);
  }

  if (sizeLabel) {
    values.push(`%${sizeLabel.trim()}%`);
    filters.push(`mp.size_label ILIKE $${values.length}`);
  }

  if (paintColor) {
    values.push(`%${paintColor.trim()}%`);
    filters.push(`latest_paint.paint_color ILIKE $${values.length}`);
  }

  if (manufacturingBatch) {
    values.push(`%${manufacturingBatch.trim()}%`);
    filters.push(`mp.manufacturing_batch ILIKE $${values.length}`);
  }

  if (manufacturedBy) {
    values.push(`%${manufacturedBy.trim()}%`);
    filters.push(`mp.manufactured_by ILIKE $${values.length}`);
  }

  if (paintedBy) {
    values.push(`%${paintedBy.trim()}%`);
    filters.push(`latest_paint.painted_by ILIKE $${values.length}`);
  }

  if (manufacturingDateFrom) {
    values.push(manufacturingDateFrom);
    filters.push(`mp.manufacturing_date >= $${values.length}`);
  }

  if (manufacturingDateTo) {
    values.push(manufacturingDateTo);
    filters.push(`mp.manufacturing_date <= $${values.length}`);
  }

  if (createdAtFrom) {
    values.push(createdAtFrom);
    filters.push(`mp.created_at >= $${values.length}::date`);
  }

  if (createdAtTo) {
    values.push(createdAtTo);
    filters.push(`mp.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  if (invoiceNumber) {
    values.push(`%${invoiceNumber.trim()}%`);
    filters.push(`latest_dispatch.invoice_number ILIKE $${values.length}`);
  }

  if (customerMobile) {
    values.push(`%${customerMobile.trim()}%`);
    filters.push(`latest_dispatch.customer_mobile ILIKE $${values.length}`);
  }

  if (customerName) {
    values.push(`%${customerName.trim()}%`);
    filters.push(`latest_dispatch.customer_name ILIKE $${values.length}`);
  }

  if (dispatchDate) {
    values.push(dispatchDate);
    filters.push(`latest_dispatch.dispatch_date = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const result = await pool.query(
    `
      ${baseProductQuery(whereClause)}
      ORDER BY mp.created_at DESC
      LIMIT 100
    `,
    values
  );

  return result.rows.map(attachProductDerivedFields);
}

export async function getProductStatusCounts() {
  const result = await pool.query(
    `
      SELECT current_status, COUNT(*)::integer AS count
      FROM manufactured_products
      WHERE current_status IN ('PAINTING_PENDING', 'PAINTED', 'IN_STOCK')
      GROUP BY current_status
    `
  );

  return {
    PAINTING_PENDING: 0,
    PAINTED: 0,
    IN_STOCK: 0,
    ...Object.fromEntries(result.rows.map((row) => [row.current_status, row.count])),
  };
}

export async function getDashboardStats() {
  const [statusResult, recentProductsResult, recentHistoryResult] = await Promise.all([
    pool.query(
      `
        SELECT current_status, COUNT(*)::integer AS count
        FROM manufactured_products
        GROUP BY current_status
      `
    ),
    pool.query(
      `
        ${baseProductQuery("")}
        ORDER BY mp.created_at DESC
        LIMIT 8
      `
    ),
    pool.query(
      `
        SELECT
          ph.id,
          ph.manufactured_product_id,
          mp.product_code,
          ph.action_type,
          ph.old_status,
          ph.new_status,
          ph.description,
          performer.name AS performed_by_name,
          ph.created_at
        FROM product_history ph
        JOIN manufactured_products mp ON mp.id = ph.manufactured_product_id
        LEFT JOIN users performer ON performer.id = ph.performed_by
        ORDER BY ph.created_at DESC
        LIMIT 10
      `
    ),
  ]);

  const counts = Object.fromEntries(statusResult.rows.map((row) => [row.current_status, row.count]));
  const totalProducts = statusResult.rows.reduce((total, row) => total + row.count, 0);

  return {
    counts: {
      TOTAL: totalProducts,
      PAINTING_PENDING: counts.PAINTING_PENDING ?? 0,
      PAINTED: counts.PAINTED ?? 0,
      IN_STOCK: counts.IN_STOCK ?? 0,
      RESERVED: counts.RESERVED ?? 0,
      DISPATCHED: counts.DISPATCHED ?? 0,
      SOLD: counts.SOLD ?? 0,
      DAMAGED_RETURNED: (counts.DAMAGED ?? 0) + (counts.RETURNED ?? 0),
    },
    recent_products: recentProductsResult.rows.map(attachProductDerivedFields),
    recent_history: recentHistoryResult.rows,
  };
}

export async function getManufacturedProductById(id) {
  const productResult = await pool.query(`${baseProductQuery("WHERE mp.id = $1")} LIMIT 1`, [id]);

  if (!productResult.rows[0]) {
    throw notFound("Product not found.");
  }

  const history = await listProductHistory(id);

  return {
    ...attachProductDerivedFields(productResult.rows[0]),
    history,
  };
}

export async function listProductHistory(id) {
  const historyResult = await pool.query(
    `
      SELECT
        ph.id,
        ph.action_type,
        ph.old_status,
        ph.new_status,
        ph.description,
        ph.performed_by,
        performer.name AS performed_by_name,
        ph.created_at
      FROM product_history ph
      LEFT JOIN users performer ON performer.id = ph.performed_by
      WHERE ph.manufactured_product_id = $1
      ORDER BY ph.created_at DESC
    `,
    [id]
  );

  return historyResult.rows;
}

export async function getManufacturedProductByCode(productCode) {
  const result = await pool.query(
    `${baseProductQuery("WHERE mp.product_code = $1")} LIMIT 1`,
    [productCode.trim().toUpperCase()]
  );

  if (!result.rows[0]) {
    throw notFound("Product not found.");
  }

  return getManufacturedProductById(result.rows[0].id);
}

export async function updateManufacturedProduct(id, input) {
  const product = normalizeProductInput(input);
  const hasDepth = Object.hasOwn(product, "depth");
  const hasSizeLabel = Object.hasOwn(product, "size_label");
  const hasMaterialGauge = Object.hasOwn(product, "material_gauge");
  const hasManufacturingBatch = Object.hasOwn(product, "manufacturing_batch");
  const hasManufacturedBy = Object.hasOwn(product, "manufactured_by");
  const hasFactoryLocation = Object.hasOwn(product, "factory_location");
  const hasRemarks = Object.hasOwn(product, "remarks");

  const result = await pool.query(
    `
      UPDATE manufactured_products
      SET
        depth = CASE WHEN $2::boolean THEN $3 ELSE depth END,
        size_label = CASE WHEN $4::boolean THEN $5 ELSE size_label END,
        material_gauge = CASE WHEN $6::boolean THEN $7 ELSE material_gauge END,
        manufacturing_batch = CASE WHEN $8::boolean THEN $9 ELSE manufacturing_batch END,
        manufactured_by = CASE WHEN $10::boolean THEN $11 ELSE manufactured_by END,
        factory_location = CASE WHEN $12::boolean THEN $13 ELSE factory_location END,
        remarks = CASE WHEN $14::boolean THEN $15 ELSE remarks END
      WHERE id = $1
      RETURNING id
    `,
    [
      id,
      hasDepth,
      product.depth,
      hasSizeLabel,
      product.size_label,
      hasMaterialGauge,
      product.material_gauge,
      hasManufacturingBatch,
      product.manufacturing_batch,
      hasManufacturedBy,
      product.manufactured_by,
      hasFactoryLocation,
      product.factory_location,
      hasRemarks,
      product.remarks,
    ]
  );

  if (!result.rows[0]) {
    throw notFound("Product not found.");
  }

  return getManufacturedProductById(id);
}

export async function updateManufacturedProductStatus(id, newStatus, userId, remarks) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      "SELECT id, current_status FROM manufactured_products WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (!currentResult.rows[0]) {
      throw notFound("Product not found.");
    }

    const oldStatus = currentResult.rows[0].current_status;

    const trimmedRemarks = remarks?.trim();
    const description =
      oldStatus === newStatus
        ? trimmedRemarks
          ? `Status confirmed as ${newStatus}: ${trimmedRemarks}`
          : `Status confirmed as ${newStatus}`
        : trimmedRemarks
          ? `Status changed from ${oldStatus} to ${newStatus}: ${trimmedRemarks}`
          : `Status changed from ${oldStatus} to ${newStatus}`;

    if (oldStatus !== newStatus) {
      await client.query("UPDATE manufactured_products SET current_status = $2 WHERE id = $1", [id, newStatus]);
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
        VALUES ($1, 'STATUS_CHANGE', $2, $3, $4, $5)
      `,
      [id, oldStatus, newStatus, description, userId]
    );

    await client.query("COMMIT");

    return getManufacturedProductById(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
