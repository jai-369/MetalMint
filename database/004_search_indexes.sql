CREATE INDEX IF NOT EXISTS idx_manufactured_products_batch
  ON manufactured_products(manufacturing_batch);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_manufactured_by
  ON manufactured_products(manufactured_by);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_created_at
  ON manufactured_products(created_at);

CREATE INDEX IF NOT EXISTS idx_painting_records_painted_by
  ON painting_records(painted_by);

CREATE INDEX IF NOT EXISTS idx_painting_records_product_created_at
  ON painting_records(manufactured_product_id, created_at DESC);
