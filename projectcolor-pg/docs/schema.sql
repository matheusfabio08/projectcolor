-- =============================================
-- PROJECTCOLOR — Schema PostgreSQL
-- Convertido de Cloudflare D1 (SQLite)
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  mocha_user_id TEXT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  sector     TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fibras (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transportadoras (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regioes_entrega (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_sheets (
  id                  SERIAL PRIMARY KEY,
  sheet_number        TEXT NOT NULL UNIQUE,
  client              TEXT NOT NULL,
  color               TEXT NOT NULL,
  order_number        TEXT,
  description         TEXT,
  entry_date          TEXT,
  expected_date       TEXT,
  created_by_user_id  TEXT REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_orders (
  id                      SERIAL PRIMARY KEY,
  sheet_id                INTEGER REFERENCES production_sheets(id),
  op_number               TEXT NOT NULL,
  client                  TEXT NOT NULL,
  color                   TEXT NOT NULL,
  order_number            TEXT,
  entry_date              TEXT,
  expected_date           TEXT,
  material                TEXT,
  quantity                NUMERIC,
  unit                    TEXT,
  requires_lab            BOOLEAN NOT NULL DEFAULT FALSE,
  requires_fabric_quality BOOLEAN DEFAULT FALSE,
  status                  TEXT NOT NULL DEFAULT 'almoxarifado',
  current_stage           TEXT,
  responsible_user_id     TEXT REFERENCES users(id),
  description             TEXT,
  region_jaragua          BOOLEAN DEFAULT FALSE,
  region_brusque          BOOLEAN DEFAULT FALSE,
  region_gaspar           BOOLEAN DEFAULT FALSE,
  fiber_id                INTEGER REFERENCES fibras(id),
  is_dual_fiber           BOOLEAN DEFAULT FALSE,
  fiber2_id               INTEGER REFERENCES fibras(id),
  is_completed            BOOLEAN DEFAULT FALSE,
  lot_number              INTEGER,
  parent_op_id            INTEGER REFERENCES production_orders(id),
  lot_meters              NUMERIC,
  recipe_weighed          BOOLEAN DEFAULT FALSE,
  priority                INTEGER DEFAULT 0,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id         SERIAL PRIMARY KEY,
  op_id      INTEGER REFERENCES production_orders(id),
  stage      TEXT,
  action     TEXT,
  user_id    TEXT REFERENCES users(id),
  details    TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_in_progress (
  id         SERIAL PRIMARY KEY,
  op_id      INTEGER REFERENCES production_orders(id),
  stage      TEXT,
  box_number TEXT,
  machine    TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_preparation (
  id              SERIAL PRIMARY KEY,
  op_id           INTEGER REFERENCES production_orders(id),
  employee_ids    TEXT,
  start_time      TEXT,
  end_time        TEXT,
  splices         TEXT,
  total_weight    NUMERIC,
  destination_box TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS preparation_batches (
  id              SERIAL PRIMARY KEY,
  batch_number    TEXT NOT NULL,
  color           TEXT NOT NULL,
  total_weight    NUMERIC,
  destination_box TEXT,
  employee_ids    TEXT,
  splices         TEXT,
  start_time      TEXT,
  end_time        TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_ops (
  id              SERIAL PRIMARY KEY,
  batch_id        INTEGER REFERENCES preparation_batches(id),
  op_id           INTEGER REFERENCES production_orders(id),
  meters_in_batch NUMERIC,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_production (
  id              SERIAL PRIMARY KEY,
  op_id           INTEGER REFERENCES production_orders(id),
  box_number      TEXT,
  machine         TEXT,
  operator        TEXT,
  has_adjustment  BOOLEAN DEFAULT FALSE,
  start_date      TEXT,
  end_date        TEXT,
  meters_produced NUMERIC,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_dryer (
  id          SERIAL PRIMARY KEY,
  op_id       INTEGER REFERENCES production_orders(id),
  destination TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_untangling (
  id                  SERIAL PRIMARY KEY,
  op_id               INTEGER REFERENCES production_orders(id),
  num_employees       INTEGER,
  meters_per_employee NUMERIC,
  employee_times      TEXT,
  start_time          TEXT,
  end_time            TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_rolling (
  id                SERIAL PRIMARY KEY,
  op_id             INTEGER REFERENCES production_orders(id),
  employee_ids      TEXT,
  num_splices       INTEGER,
  num_rolls         INTEGER,
  issue_description TEXT,
  start_time        TEXT,
  end_time          TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_quality (
  id              SERIAL PRIMARY KEY,
  op_id           INTEGER REFERENCES production_orders(id),
  rolls_sent      INTEGER,
  meters_per_roll NUMERIC,
  discrepancy     TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_laboratory (
  id                 SERIAL PRIMARY KEY,
  op_id              INTEGER REFERENCES production_orders(id),
  num_batches        INTEGER,
  is_recipe_ready    BOOLEAN DEFAULT FALSE,
  recipe_origin_date TEXT,
  description        TEXT,
  is_approved        BOOLEAN DEFAULT FALSE,
  start_time         TEXT,
  end_time           TEXT,
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_pesagem (
  id          SERIAL PRIMARY KEY,
  op_id       INTEGER REFERENCES production_orders(id),
  start_time  TIMESTAMP,
  end_time    TIMESTAMP,
  employee_id TEXT REFERENCES users(id),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_box4 (
  id                 SERIAL PRIMARY KEY,
  po_id              INTEGER REFERENCES production_orders(id),
  employee_id        TEXT,
  has_adjustment     BOOLEAN DEFAULT FALSE,
  adjustment_details TEXT,
  is_reprocess       BOOLEAN DEFAULT FALSE,
  reprocess_reason   TEXT,
  timestamp          TEXT,
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_box5 (
  id                 SERIAL PRIMARY KEY,
  po_id              INTEGER REFERENCES production_orders(id),
  employee_id        TEXT,
  has_adjustment     BOOLEAN DEFAULT FALSE,
  adjustment_details TEXT,
  is_reprocess       BOOLEAN DEFAULT FALSE,
  reprocess_reason   TEXT,
  timestamp          TEXT,
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_box6 (
  id                 SERIAL PRIMARY KEY,
  po_id              INTEGER REFERENCES production_orders(id),
  employee_id        TEXT,
  has_adjustment     BOOLEAN DEFAULT FALSE,
  adjustment_details TEXT,
  is_reprocess       BOOLEAN DEFAULT FALSE,
  reprocess_reason   TEXT,
  timestamp          TEXT,
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fabric_quality_inspections (
  id                 SERIAL PRIMARY KEY,
  inspection_number  TEXT NOT NULL,
  item_description   TEXT NOT NULL,
  weight             NUMERIC NOT NULL,
  destination_sector TEXT NOT NULL,
  observations       TEXT,
  defect_image_url   TEXT,
  employee_name      TEXT NOT NULL,
  inspection_date    TEXT NOT NULL,
  priority           TEXT DEFAULT 'normal',
  status             TEXT DEFAULT 'pending',
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lista_saida (
  id                SERIAL PRIMARY KEY,
  op_id             INTEGER REFERENCES production_orders(id),
  exit_date         TEXT,
  exit_time         TEXT,
  transportadora_id INTEGER REFERENCES transportadoras(id),
  regiao_id         INTEGER REFERENCES regioes_entrega(id),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_po_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_sheet_id ON production_orders(sheet_id);
CREATE INDEX IF NOT EXISTS idx_po_is_completed ON production_orders(is_completed);
CREATE INDEX IF NOT EXISTS idx_po_expected_date ON production_orders(expected_date);
CREATE INDEX IF NOT EXISTS idx_po_requires_lab ON production_orders(requires_lab);
CREATE INDEX IF NOT EXISTS idx_activity_log_op_id ON activity_log(op_id);
CREATE INDEX IF NOT EXISTS idx_lista_saida_op_id ON lista_saida(op_id);
