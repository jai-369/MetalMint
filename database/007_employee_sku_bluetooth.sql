-- Core customizations for Steel Almirah Business

-- 1. Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('fabricator', 'painter', 'helper', 'supervisor')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Link tables for manufactured_products (supports multiple workers)
CREATE TABLE IF NOT EXISTS product_manufactured_by (
  manufactured_product_id UUID REFERENCES manufactured_products(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (manufactured_product_id, employee_id)
);

-- 3. Link tables for painting_records (supports multiple painters)
CREATE TABLE IF NOT EXISTS painting_painted_by (
  painting_record_id UUID REFERENCES painting_records(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (painting_record_id, employee_id)
);

-- 4. Add Doors and Weight Class variant columns to manufactured_products
ALTER TABLE manufactured_products 
  ADD COLUMN IF NOT EXISTS doors VARCHAR(20) DEFAULT '2-Door' CHECK (doors IN ('2-Door', '4-Door')),
  ADD COLUMN IF NOT EXISTS weight_class VARCHAR(20) DEFAULT 'Heavy' CHECK (weight_class IN ('Lightweight', 'Heavy')),
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- 5. Seed default employees roster
INSERT INTO employees (name, role) VALUES
  ('Rajesh Kumar', 'fabricator'),
  ('Amit Sharma', 'fabricator'),
  ('Sunil Singh', 'painter'),
  ('Vikram Yadav', 'painter')
ON CONFLICT (name) DO NOTHING;

-- 6. Seed the 9 standard SKUs into product_types
INSERT INTO product_types (name, code, category, description, is_active) VALUES
  ('Wardrobe 74x48x19', 'ALM744819', 'Wardrobe', 'Standard Wardrobe 74H x 48W x 19D inches', true),
  ('Wardrobe 74x38x19', 'ALM743819', 'Wardrobe', 'Standard Wardrobe 74H x 38W x 19D inches', true),
  ('Wardrobe 74x38x17', 'ALM743817', 'Wardrobe', 'Standard Wardrobe 74H x 38W x 17D inches', true),
  ('Wardrobe 74x34x19', 'ALM743419', 'Wardrobe', 'Standard Wardrobe 74H x 34W x 19D inches', true),
  ('Wardrobe 74x34x17', 'ALM743417', 'Wardrobe', 'Standard Wardrobe 74H x 34W x 17D inches', true),
  ('Wardrobe 66x34x17', 'ALM663417', 'Wardrobe', 'Standard Wardrobe 66H x 34W x 17D inches', true),
  ('Wardrobe 66x30x15', 'ALM663015', 'Wardrobe', 'Standard Wardrobe 66H x 30W x 15D inches', true),
  ('Wardrobe 54x30x15', 'ALM543015', 'Wardrobe', 'Standard Wardrobe 54H x 30W x 15D inches', true),
  ('Wardrobe 54x34x15', 'ALM543415', 'Wardrobe', 'Standard Wardrobe 54H x 34W x 15D inches', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = true;
