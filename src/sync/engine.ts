import type { IDbClient } from '../db/client'
import { isSyncConfigured, supabase } from './supabaseClient'

interface TableSpec {
  name: string
  columns: string[]
}

const TABLES: TableSpec[] = [
  { name: 'products', columns: ['id', 'code', 'name', 'price_cents', 'stock', 'unit', 'updated_at', 'device_id', 'deleted'] },
  { name: 'orders', columns: ['id', 'status', 'table_number', 'total_cents', 'created_at', 'updated_at', 'device_id', 'deleted'] },
  {
    name: 'order_items',
    columns: ['id', 'order_id', 'product_id', 'product_name', 'quantity', 'unit_price_cents', 'updated_at', 'device_id', 'deleted'],
  },
  { name: 'payments', columns: ['id', 'order_id', 'method', 'amount_cents', 'created_at', 'updated_at', 'device_id', 'deleted'] },
  {
    name: 'cash_sessions',
    columns: [
      'id',
      'status',
      'opening_amount_cents',
      'counted_amount_cents',
      'expected_amount_cents',
      'opened_at',
      'closed_at',
      'updated_at',
      'device_id',
      'deleted',
    ],
  },
  {
    name: 'cash_movements',
    columns: ['id', 'session_id', 'type', 'amount_cents', 'reason', 'created_at', 'updated_at', 'device_id', 'deleted'],
  },
]

const LAST_SYNCED_KEY = 'pdv_last_synced_at'
const EPOCH = '1970-01-01T00:00:00.000Z'

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNCED_KEY)
}

async function pushTable(db: IDbClient, table: TableSpec, since: string, businessId: string): Promise<number> {
  const rows = await db.query<Record<string, unknown>>(
    `SELECT ${table.columns.join(', ')} FROM ${table.name} WHERE updated_at > ?`,
    [since],
  )
  if (rows.length === 0) return 0

  const payload = rows.map((row) => ({ ...row, deleted: Boolean(row.deleted), business_id: businessId }))
  const { error } = await supabase!.from(table.name).upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(`push ${table.name}: ${error.message}`)
  return rows.length
}

async function pullTable(db: IDbClient, table: TableSpec, since: string, businessId: string): Promise<number> {
  const { data, error } = await supabase!
    .from(table.name)
    .select(table.columns.join(', '))
    .eq('business_id', businessId)
    .gt('updated_at', since)
  if (error) throw new Error(`pull ${table.name}: ${error.message}`)
  if (!data || data.length === 0) return 0

  const updateCols = table.columns.filter((c) => c !== 'id')
  const sql = `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${table.columns.map(() => '?').join(', ')})
               ON CONFLICT(id) DO UPDATE SET ${updateCols.map((c) => `${c} = excluded.${c}`).join(', ')}`

  for (const row of data as unknown as Record<string, unknown>[]) {
    const values = table.columns.map((c) => (c === 'deleted' ? (row[c] ? 1 : 0) : (row[c] as string | number | null)))
    await db.exec(sql, values)
  }
  return data.length
}

export interface SyncResult {
  pushed: number
  pulled: number
}

export async function syncNow(db: IDbClient): Promise<SyncResult> {
  if (!isSyncConfigured || !supabase) throw new Error('Sync não configurado')

  const { data: sessionData } = await supabase.auth.getSession()
  const businessId = sessionData.session?.user.id
  if (!businessId) throw new Error('Não autenticado')

  const since = getLastSyncedAt() ?? EPOCH
  const cursor = new Date().toISOString()

  let pushed = 0
  let pulled = 0
  for (const table of TABLES) {
    pushed += await pushTable(db, table, since, businessId)
  }
  for (const table of TABLES) {
    pulled += await pullTable(db, table, since, businessId)
  }

  localStorage.setItem(LAST_SYNCED_KEY, cursor)
  return { pushed, pulled }
}
