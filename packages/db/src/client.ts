import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
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
