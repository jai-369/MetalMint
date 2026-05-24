CREATE TABLE IF NOT EXISTS daily_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(40) NOT NULL,
  sequence_date DATE NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, sequence_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_code_sequences_lookup
  ON daily_code_sequences(scope, sequence_date);

DROP TRIGGER IF EXISTS trg_daily_code_sequences_updated_at ON daily_code_sequences;
CREATE TRIGGER trg_daily_code_sequences_updated_at
BEFORE UPDATE ON daily_code_sequences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
