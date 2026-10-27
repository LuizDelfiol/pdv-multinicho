import Database from '@tauri-apps/plugin-sql'
import type { IDbClient, SqlParam } from './client'
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, SCHEMA_SQL } from './schema'

export class TauriSqlAdapter implements IDbClient {
  private db: Database | null = null

  async init(): Promise<void> {
    this.db = await Database.load('sqlite:pdv.db')

    const existingTables = await this.db.select<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'orders'",
    )
    const isNewDb = existingTables.length === 0

    for (const statement of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await this.db.execute(statement)
    }

    if (isNewDb) {
      await this.db.execute(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`)
    } else {
      const rows = await this.db.select<{ user_version: number }[]>('PRAGMA user_version')
      const version = rows[0]?.user_version ?? 0
      for (const migration of MIGRATIONS.filter((m) => m.version > version)) {
        await this.db.execute(migration.sql)
        await this.db.execute(`PRAGMA user_version = ${migration.version}`)
      }
    }
  }

  private requireDb(): Database {
    if (!this.db) throw new Error('DB não inicializado — chame init() primeiro')
    return this.db
  }

  async query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    return this.requireDb().select<T[]>(sql, params)
  }

  async exec(sql: string, params: SqlParam[] = []): Promise<void> {
    await this.requireDb().execute(sql, params)
  }

  async transaction(fn: () => Promise<void>): Promise<void> {
    const db = this.requireDb()
    await db.execute('BEGIN')
    try {
      await fn()
      await db.execute('COMMIT')
    } catch (err) {
      await db.execute('ROLLBACK')
      throw err
    }
  }
}
