import "../config/env.js";
import { pool } from "../db/pool.js";
import { buildShortCode, CODE_SCOPES, normalizeSequenceDate } from "../utils/shortCode.js";

async function ensureDailyCodeTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS daily_code_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope VARCHAR(40) NOT NULL,
      sequence_date DATE NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (scope, sequence_date)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_daily_code_sequences_lookup
      ON daily_code_sequences(scope, sequence_date)
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS trg_daily_code_sequences_updated_at ON daily_code_sequences
  `);

  await client.query(`
    CREATE TRIGGER trg_daily_code_sequences_updated_at
    BEFORE UPDATE ON daily_code_sequences
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at()
  `);
}

function assignCodes(rows, { scope, getId, getDate, getTempCode }) {
  const perDayCounters = new Map();
  const sequenceSnapshots = new Map();

  const assignments = rows.map((row) => {
    const sequenceDate = normalizeSequenceDate(getDate(row));
    const nextSequence = (perDayCounters.get(sequenceDate) ?? 0) + 1;
    perDayCounters.set(sequenceDate, nextSequence);
    sequenceSnapshots.set(`${scope}:${sequenceDate}`, {
      scope,
      sequenceDate,
      lastValue: nextSequence,
    });

    return {
      id: getId(row),
      tempCode: getTempCode(row),
      finalCode: buildShortCode(scope, sequenceDate, nextSequence),
    };
  });

  return {
    assignments,
    sequenceSnapshots,
  };
}

async function applyCodeUpdates(client, { tableName, idColumn, codeColumn, assignments }) {
  for (const assignment of assignments) {
    await client.query(
      `UPDATE ${tableName} SET ${codeColumn} = $2 WHERE ${idColumn} = $1`,
      [assignment.id, assignment.tempCode]
    );
  }

  for (const assignment of assignments) {
    await client.query(
      `UPDATE ${tableName} SET ${codeColumn} = $2 WHERE ${idColumn} = $1`,
      [assignment.id, assignment.finalCode]
    );
  }
}

async function seedDailySequences(client, snapshots) {
  await client.query("DELETE FROM daily_code_sequences");

  for (const snapshot of snapshots.values()) {
    await client.query(
      `
        INSERT INTO daily_code_sequences (scope, sequence_date, last_value)
        VALUES ($1, $2::date, $3)
      `,
      [snapshot.scope, snapshot.sequenceDate, snapshot.lastValue]
    );
  }
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureDailyCodeTable(client);

    const snapshots = new Map();

    const productRows = (
      await client.query(`
        SELECT id, manufacturing_date, created_at
        FROM manufactured_products
        ORDER BY manufacturing_date ASC, created_at ASC, id ASC
      `)
    ).rows;

    const productAssignments = assignCodes(productRows, {
      scope: CODE_SCOPES.PRODUCT,
      getId: (row) => row.id,
      getDate: (row) => row.manufacturing_date || row.created_at,
      getTempCode: (row) => `TMPP${String(row.id).replaceAll("-", "").slice(0, 8)}`,
    });

    for (const [key, value] of productAssignments.sequenceSnapshots.entries()) {
      snapshots.set(key, value);
    }

    await applyCodeUpdates(client, {
      tableName: "manufactured_products",
      idColumn: "id",
      codeColumn: "product_code",
      assignments: productAssignments.assignments,
    });

    await client.query(`
      UPDATE sales_invoice_items sii
      SET product_code = mp.product_code
      FROM manufactured_products mp
      WHERE mp.id = sii.manufactured_product_id
    `);

    const salesRows = (
      await client.query(`
        SELECT id, sale_date, created_at
        FROM sales_invoices
        ORDER BY sale_date ASC, created_at ASC, id ASC
      `)
    ).rows;

    const salesAssignments = assignCodes(salesRows, {
      scope: CODE_SCOPES.SALES_INVOICE,
      getId: (row) => row.id,
      getDate: (row) => row.sale_date || row.created_at,
      getTempCode: (row) => `TMPS${String(row.id).replaceAll("-", "").slice(0, 8)}`,
    });

    for (const [key, value] of salesAssignments.sequenceSnapshots.entries()) {
      snapshots.set(key, value);
    }

    await applyCodeUpdates(client, {
      tableName: "sales_invoices",
      idColumn: "id",
      codeColumn: "invoice_number",
      assignments: salesAssignments.assignments,
    });

    await client.query(`
      UPDATE product_history ph
      SET description = 'Product sold through invoice ' || si.invoice_number
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON si.id = sii.sales_invoice_id
      WHERE ph.action_type = 'SALE'
        AND ph.manufactured_product_id = sii.manufactured_product_id
    `);

    const repairRows = (
      await client.query(`
        SELECT id, COALESCE(service_start_date, created_at::date) AS sequence_date, created_at
        FROM repair_jobs
        ORDER BY COALESCE(service_start_date, created_at::date) ASC, created_at ASC, id ASC
      `)
    ).rows;

    const repairAssignments = assignCodes(repairRows, {
      scope: CODE_SCOPES.REPAIR_INVOICE,
      getId: (row) => row.id,
      getDate: (row) => row.sequence_date || row.created_at,
      getTempCode: (row) => `TMPR${String(row.id).replaceAll("-", "").slice(0, 8)}`,
    });

    for (const [key, value] of repairAssignments.sequenceSnapshots.entries()) {
      snapshots.set(key, value);
    }

    await applyCodeUpdates(client, {
      tableName: "repair_jobs",
      idColumn: "id",
      codeColumn: "service_invoice_number",
      assignments: repairAssignments.assignments,
    });

    await seedDailySequences(client, snapshots);

    await client.query("COMMIT");

    console.log(
      `Short code rebuild complete. Products: ${productAssignments.assignments.length}, sales invoices: ${salesAssignments.assignments.length}, repair jobs: ${repairAssignments.assignments.length}.`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to rebuild short codes.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
