import initSqlJs, { type Database } from 'sql.js'
import type { IDbClient, SqlParam } from './client'
import { loadDbBytes, saveDbBytes } from './idbStore'
import { SCHEMA_SQL } from './schema'

export class SqlJsAdapter implements IDbClient {
  private db: Database | null = null
  private suspendPersist = 0

  async init(): Promise<void> {
    const SQL = await initSqlJs({ locateFile: (file) => `/${file}` })
    const existing = await loadDbBytes()
    this.db = existing ? new SQL.Database(existing) : new SQL.Database()
    if (!existing) {
      this.db.run(SCHEMA_SQL)
      await this.persist()
    }
  }

  private requireDb(): Database {
    if (!this.db) throw new Error('DB não inicializado — chame init() primeiro')
    return this.db
  }

  private async persist(): Promise<void> {
    if (this.suspendPersist > 0) return
    await saveDbBytes(this.requireDb().export())
  }

  async query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const db = this.requireDb()
    const stmt = db.prepare(sql)
    try {
      stmt.bind(params)
      const rows: T[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T)
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  async exec(sql: string, params: SqlParam[] = []): Promise<void> {
    const db = this.requireDb()
    db.run(sql, params)
    await this.persist()
  }

  async transaction(fn: () => Promise<void>): Promise<void> {
    const db = this.requireDb()
    this.suspendPersist++
    db.run('BEGIN')
    try {
      await fn()
      db.run('COMMIT')
    } catch (err) {
      db.run('ROLLBACK')
      throw err
    } finally {
      this.suspendPersist--
      await this.persist()
    }
  }
}
