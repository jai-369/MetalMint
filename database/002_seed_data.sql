INSERT INTO product_types (name, code, category, description)
VALUES
  ('2 Door Almirah', 'ALM2D', 'Almirah', 'Standard 2 door steel almirah'),
  ('3 Door Almirah', 'ALM3D', 'Almirah', 'Standard 3 door steel almirah'),
  ('Locker', 'LKR', 'Storage', 'Steel locker unit'),
  ('Office Cabinet', 'OFC', 'Office Furniture', 'Steel office cabinet'),
  ('Filing Cabinet', 'FIL', 'Office Furniture', 'Steel filing cabinet'),
  ('Rack', 'RCK', 'Storage', 'Steel storage rack'),
  ('Custom Product', 'CUS', 'Custom', 'Custom manufactured steel furniture')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_active = true;

INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
  'FactoryTrack Admin',
  'admin@example.local',
  'PLACEHOLDER_PASSWORD_HASH_REPLACE_BEFORE_USE',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
