CREATE TABLE IF NOT EXISTS product_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id UUID NOT NULL REFERENCES product_types(id),
  size_code VARCHAR(24) NOT NULL,
  year_month CHAR(4) NOT NULL,
  last_serial INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_type_id, size_code, year_month)
);

CREATE INDEX IF NOT EXISTS idx_product_code_sequences_lookup
  ON product_code_sequences(product_type_id, size_code, year_month);

DROP TRIGGER IF EXISTS trg_product_code_sequences_updated_at ON product_code_sequences;
CREATE TRIGGER trg_product_code_sequences_updated_at
BEFORE UPDATE ON product_code_sequences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
