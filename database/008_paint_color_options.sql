CREATE TABLE IF NOT EXISTS paint_color_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paint_color_options_active_order
  ON paint_color_options(is_active, display_order, name);

DROP TRIGGER IF EXISTS trg_paint_color_options_updated_at ON paint_color_options;
CREATE TRIGGER trg_paint_color_options_updated_at
BEFORE UPDATE ON paint_color_options
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO paint_color_options (name, display_order, is_active)
VALUES
  ('Royal Blue', 10, true),
  ('Slate Grey', 20, true),
  ('Olive Green', 30, true),
  ('Chocolate Brown', 40, true),
  ('Standard Grey', 50, true),
  ('Maroon Red', 60, true),
  ('Pearly White', 70, true)
ON CONFLICT (name) DO NOTHING;
