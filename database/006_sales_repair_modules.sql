CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(80) NOT NULL UNIQUE,
  customer_name VARCHAR(160),
  customer_mobile VARCHAR(30),
  customer_location TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  manufactured_product_id UUID NOT NULL REFERENCES manufactured_products(id),
  product_code VARCHAR(80) NOT NULL,
  product_type_name VARCHAR(120) NOT NULL,
  product_type_code VARCHAR(24) NOT NULL,
  size_label VARCHAR(80),
  paint_color VARCHAR(80),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repair_status') THEN
    CREATE TYPE repair_status AS ENUM (
      'RECEIVED',
      'IN_PROGRESS',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS repair_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_invoice_number VARCHAR(80) NOT NULL UNIQUE,
  product_type VARCHAR(120) NOT NULL,
  product_category VARCHAR(120),
  brand VARCHAR(120),
  model VARCHAR(120),
  product_condition TEXT,
  service_description TEXT NOT NULL,
  problem_reported TEXT,
  estimated_duration VARCHAR(120),
  customer_name VARCHAR(160) NOT NULL,
  customer_location TEXT,
  customer_phone VARCHAR(30),
  service_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  service_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
  repair_status repair_status NOT NULL DEFAULT 'RECEIVED',
  remarks TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_sales_invoices_updated_at ON sales_invoices;
CREATE TRIGGER trg_sales_invoices_updated_at
BEFORE UPDATE ON sales_invoices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_repair_jobs_updated_at ON repair_jobs;
CREATE TRIGGER trg_repair_jobs_updated_at
BEFORE UPDATE ON repair_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_sale_date ON sales_invoices(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product ON sales_invoice_items(manufactured_product_id);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_invoice_number ON repair_jobs(service_invoice_number);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_status ON repair_jobs(repair_status);
CREATE INDEX IF NOT EXISTS idx_repair_jobs_customer_phone ON repair_jobs(customer_phone);
