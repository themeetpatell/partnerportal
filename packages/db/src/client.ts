import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "./schema"

type GlobalDbCache = {
  db?: Db
}

function getPoolMax() {
  const raw = process.env.DATABASE_POOL_MAX

  if (raw) {
    const parsed = Number.parseInt(raw, 10)

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return process.env.NODE_ENV === "production" ? 5 : 10
}

function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("Supabase DATABASE_URL is not set")
  const client = postgres(databaseUrl, {
    prepare: false,
    max: getPoolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

const globalDb = globalThis as typeof globalThis & {
  __finanshelsDbCache?: GlobalDbCache
}

export function getDb(): Db {
  if (!globalDb.__finanshelsDbCache) {
    globalDb.__finanshelsDbCache = {}
  }

  if (!globalDb.__finanshelsDbCache.db) {
    globalDb.__finanshelsDbCache.db = createDb()
  }

  return globalDb.__finanshelsDbCache.db
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb()
    const value = Reflect.get(instance as object, prop, receiver)

    return typeof value === "function" ? value.bind(instance) : value
  },
}) as Db
