import { badRequest } from "./httpError.js";

export const CODE_SCOPES = {
  PRODUCT: "PRODUCT",
  SALES_INVOICE: "SALES_INVOICE",
  REPAIR_INVOICE: "REPAIR_INVOICE",
};

const SCOPE_PREFIXES = {
  [CODE_SCOPES.PRODUCT]: "P",
  [CODE_SCOPES.SALES_INVOICE]: "I",
  [CODE_SCOPES.REPAIR_INVOICE]: "R",
};

const MAX_DAILY_SEQUENCE = 99;

function getDateParts(dateValue) {
  if (!dateValue) {
    throw badRequest("A code date is required.");
  }

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      throw badRequest("Invalid code date.");
    }

    return {
      year: dateValue.getFullYear(),
      month: dateValue.getMonth() + 1,
      day: dateValue.getDate(),
    };
  }

  const directMatch = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (directMatch) {
    return {
      year: Number(directMatch[1]),
      month: Number(directMatch[2]),
      day: Number(directMatch[3]),
    };
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    throw badRequest("Invalid code date.");
  }

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

export function normalizeSequenceDate(dateValue) {
  const { year, month, day } = getDateParts(dateValue);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getPrefix(scope) {
  const prefix = SCOPE_PREFIXES[scope];

  if (!prefix) {
    throw badRequest("Unknown code scope.");
  }

  return prefix;
}

export function buildShortCode(scope, dateValue, sequence) {
  const numericSequence = Number(sequence);

  if (!Number.isInteger(numericSequence) || numericSequence <= 0) {
    throw badRequest("Code sequence must be a positive integer.");
  }

  if (numericSequence > MAX_DAILY_SEQUENCE) {
    throw badRequest(`Daily auto-code limit reached. Maximum ${MAX_DAILY_SEQUENCE} records can be created in one day.`);
  }

  const { year, month, day } = getDateParts(dateValue);
  const prefix = getPrefix(scope);

  return `${prefix}${String(day).padStart(2, "0")}${String(month).padStart(2, "0")}${String(year).slice(-1)}${String(numericSequence).padStart(2, "0")}`;
}

async function getExistingDailyMaxSequence(client, { scope, sequenceDate }) {
  const prefix = getPrefix(scope);
  const configByScope = {
    [CODE_SCOPES.PRODUCT]: {
      tableName: "manufactured_products",
      codeColumn: "product_code",
      dateColumn: "manufacturing_date",
    },
    [CODE_SCOPES.SALES_INVOICE]: {
      tableName: "sales_invoices",
      codeColumn: "invoice_number",
      dateColumn: "sale_date",
    },
    [CODE_SCOPES.REPAIR_INVOICE]: {
      tableName: "repair_jobs",
      codeColumn: "service_invoice_number",
      dateColumn: "service_start_date",
    },
  };

  const config = configByScope[scope];

  if (!config) {
    throw badRequest("Unknown code scope.");
  }

  const result = await client.query(
    `
      SELECT COALESCE(MAX(RIGHT(${config.codeColumn}, 2)::int), 0) AS max_sequence
      FROM ${config.tableName}
      WHERE ${config.dateColumn} = $1::date
        AND ${config.codeColumn} ~ $2
    `,
    [sequenceDate, `^${prefix}[0-9]{7}$`]
  );

  return Number(result.rows[0]?.max_sequence ?? 0);
}

export async function reserveDailyCode(client, { scope, dateValue }) {
  const sequenceDate = normalizeSequenceDate(dateValue);
  const existingMax = await getExistingDailyMaxSequence(client, { scope, sequenceDate });
  const result = await client.query(
    `
      INSERT INTO daily_code_sequences (scope, sequence_date, last_value)
      VALUES ($1, $2::date, $3)
      ON CONFLICT (scope, sequence_date)
      DO UPDATE SET last_value = GREATEST(daily_code_sequences.last_value, $4) + 1
      RETURNING sequence_date, last_value
    `,
    [scope, sequenceDate, existingMax + 1, existingMax]
  );

  return buildShortCode(scope, result.rows[0].sequence_date, result.rows[0].last_value);
}
