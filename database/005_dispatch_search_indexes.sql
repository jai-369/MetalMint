CREATE INDEX IF NOT EXISTS idx_dispatch_records_customer_mobile
  ON dispatch_records(customer_mobile);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_customer_name
  ON dispatch_records(customer_name);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_dispatch_date
  ON dispatch_records(dispatch_date);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_product_created_at
  ON dispatch_records(manufactured_product_id, created_at DESC);
