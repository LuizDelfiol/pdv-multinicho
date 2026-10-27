export type SqlParam = string | number | null

export interface IDbClient {
  init(): Promise<void>
  query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>
  exec(sql: string, params?: SqlParam[]): Promise<void>
  transaction(fn: () => Promise<void>): Promise<void>
}
