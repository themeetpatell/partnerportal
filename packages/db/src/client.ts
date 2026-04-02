import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "./schema"

function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("Supabase DATABASE_URL is not set")
  const client = postgres(databaseUrl, { prepare: false })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

let cachedDb: Db | undefined

export function getDb(): Db {
  if (!cachedDb) {
    cachedDb = createDb()
  }

  return cachedDb
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb()
    const value = Reflect.get(instance as object, prop, receiver)

    return typeof value === "function" ? value.bind(instance) : value
  },
}) as Db
