CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'staff', 'viewer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM (
      'MANUFACTURED',
      'PAINTING_PENDING',
      'PAINTED',
      'IN_STOCK',
      'RESERVED',
      'DISPATCHED',
      'SOLD',
      'RETURNED',
      'DAMAGED',
      'UNDER_SERVICE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'painting_status') THEN
    CREATE TYPE painting_status AS ENUM (
      'PENDING',
      'PAINTED',
      'REPAINT_REQUIRED'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  code VARCHAR(24) NOT NULL UNIQUE,
  category VARCHAR(80),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS manufactured_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR(80) NOT NULL UNIQUE,
  product_type_id UUID NOT NULL REFERENCES product_types(id),
  width NUMERIC(10, 2),
  height NUMERIC(10, 2),
  depth NUMERIC(10, 2),
  size_label VARCHAR(80),
  material_gauge VARCHAR(40),
  manufacturing_date DATE NOT NULL,
  manufacturing_batch VARCHAR(80),
  manufactured_by VARCHAR(120),
  factory_location VARCHAR(120),
  current_status product_status NOT NULL DEFAULT 'MANUFACTURED',
  remarks TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS painting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufactured_product_id UUID NOT NULL REFERENCES manufactured_products(id) ON DELETE CASCADE,
  painted_by VARCHAR(120),
  paint_color VARCHAR(80),
  paint_brand VARCHAR(120),
  paint_batch_number VARCHAR(80),
  coating_type VARCHAR(80),
  painting_date DATE,
  painting_time TIME,
  painting_status painting_status NOT NULL DEFAULT 'PENDING',
  repaint_required BOOLEAN NOT NULL DEFAULT false,
  remarks TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufactured_product_id UUID NOT NULL REFERENCES manufactured_products(id) ON DELETE CASCADE,
  customer_name VARCHAR(160) NOT NULL,
  customer_mobile VARCHAR(30),
  invoice_number VARCHAR(80),
  sale_price NUMERIC(12, 2),
  dispatch_date DATE,
  delivery_location TEXT,
  transport_details TEXT,
  vehicle_number VARCHAR(40),
  remarks TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufactured_product_id UUID NOT NULL REFERENCES manufactured_products(id) ON DELETE CASCADE,
  action_type VARCHAR(80) NOT NULL,
  old_status product_status,
  new_status product_status,
  description TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS daily_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(40) NOT NULL,
  sequence_date DATE NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, sequence_date)
);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_product_code
  ON manufactured_products(product_code);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_status
  ON manufactured_products(current_status);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_product_type_id
  ON manufactured_products(product_type_id);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_manufacturing_date
  ON manufactured_products(manufacturing_date);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_batch
  ON manufactured_products(manufacturing_batch);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_manufactured_by
  ON manufactured_products(manufactured_by);

CREATE INDEX IF NOT EXISTS idx_manufactured_products_created_at
  ON manufactured_products(created_at);

CREATE INDEX IF NOT EXISTS idx_painting_records_paint_color
  ON painting_records(paint_color);

CREATE INDEX IF NOT EXISTS idx_painting_records_painted_by
  ON painting_records(painted_by);

CREATE INDEX IF NOT EXISTS idx_painting_records_product_created_at
  ON painting_records(manufactured_product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_invoice_number
  ON dispatch_records(invoice_number);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_customer_mobile
  ON dispatch_records(customer_mobile);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_customer_name
  ON dispatch_records(customer_name);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_dispatch_date
  ON dispatch_records(dispatch_date);

CREATE INDEX IF NOT EXISTS idx_dispatch_records_product_created_at
  ON dispatch_records(manufactured_product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_code_sequences_lookup
  ON product_code_sequences(product_type_id, size_code, year_month);

CREATE INDEX IF NOT EXISTS idx_daily_code_sequences_lookup
  ON daily_code_sequences(scope, sequence_date);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_types_updated_at ON product_types;
CREATE TRIGGER trg_product_types_updated_at
BEFORE UPDATE ON product_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_manufactured_products_updated_at ON manufactured_products;
CREATE TRIGGER trg_manufactured_products_updated_at
BEFORE UPDATE ON manufactured_products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_painting_records_updated_at ON painting_records;
CREATE TRIGGER trg_painting_records_updated_at
BEFORE UPDATE ON painting_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_dispatch_records_updated_at ON dispatch_records;
CREATE TRIGGER trg_dispatch_records_updated_at
BEFORE UPDATE ON dispatch_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_code_sequences_updated_at ON product_code_sequences;
CREATE TRIGGER trg_product_code_sequences_updated_at
BEFORE UPDATE ON product_code_sequences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_code_sequences_updated_at ON daily_code_sequences;
CREATE TRIGGER trg_daily_code_sequences_updated_at
BEFORE UPDATE ON daily_code_sequences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
