export interface Product {
  id: string
  code: string | null
  name: string
  price_cents: number
  stock: number
  unit: string
  updated_at: string
  device_id: string
  deleted: number
}

export type OrderStatus = 'aberta' | 'finalizada' | 'cancelada'

export interface Order {
  id: string
  status: OrderStatus
  table_number: string | null
  total_cents: number
  staff_name: string | null
  created_at: string
  updated_at: string
  device_id: string
  deleted: number
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price_cents: number
  updated_at: string
  device_id: string
  deleted: number
}

export type PaymentMethod = 'dinheiro' | 'cartao' | 'pix'

export interface Payment {
  id: string
  order_id: string
  method: PaymentMethod
  amount_cents: number
  created_at: string
  updated_at: string
  device_id: string
  deleted: number
}

export interface BusinessConfig {
  id: string
  name: string
  business_type: string
  updated_at: string
  device_id: string
  deleted: number
}

export type CashSessionStatus = 'aberto' | 'fechado'

export interface CashSession {
  id: string
  status: CashSessionStatus
  opening_amount_cents: number
  counted_amount_cents: number | null
  expected_amount_cents: number | null
  staff_name: string | null
  opened_at: string
  closed_at: string | null
  updated_at: string
  device_id: string
  deleted: number
}

export type CashMovementType = 'sangria' | 'suprimento'

export interface CashMovement {
  id: string
  session_id: string
  type: CashMovementType
  amount_cents: number
  reason: string | null
  staff_name: string | null
  created_at: string
  updated_at: string
  device_id: string
  deleted: number
}

export type StaffRole = 'operador' | 'gerente' | 'administrador'

export interface Staff {
  id: string
  name: string
  role: StaffRole
  // null = sem PIN definido neste terminal ainda (ex: staff chegou via sync de outro
  // terminal — pin_hash nunca sincroniza). Precisa "Redefinir PIN" aqui pra conseguir logar.
  pin_hash: string | null
  updated_at: string
  device_id: string
  deleted: number
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stock REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  table_number TEXT,
  total_cents INTEGER NOT NULL DEFAULT 0,
  staff_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS business_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  opening_amount_cents INTEGER NOT NULL,
  counted_amount_cents INTEGER,
  expected_amount_cents INTEGER,
  staff_name TEXT,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT,
  staff_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  pin_hash TEXT,
  updated_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
`

// Evolui bancos já existentes (CREATE TABLE acima já nasce com o schema atual,
// então um banco novo pula direto pra CURRENT_SCHEMA_VERSION sem rodar nada daqui).
export interface Migration {
  version: number
  sql: string
}

export const MIGRATIONS: Migration[] = [
  { version: 1, sql: 'ALTER TABLE orders ADD COLUMN table_number TEXT' },
  { version: 2, sql: 'ALTER TABLE orders ADD COLUMN staff_name TEXT' },
  { version: 3, sql: 'ALTER TABLE cash_sessions ADD COLUMN staff_name TEXT' },
  { version: 4, sql: 'ALTER TABLE cash_movements ADD COLUMN staff_name TEXT' },
]

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0)
